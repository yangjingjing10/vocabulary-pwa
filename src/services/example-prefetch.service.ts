import { getApiConfig } from '@/db/repositories/api-config.repository'
import { getAllWords } from '@/db/repositories/words.repository'
import { getUserExamplesForWord } from '@/db/repositories/local-dict.repository'
import type { VocabularyWord } from '@/db/schema/database'
import {
  ensureLocalDictionary,
  lookupLocalExamples,
} from '@/services/local-dictionary.service'
import { generateQualityExamplesForWord } from '@/services/example-generation.service'
import {
  hasEnoughQualityExamples,
  selectQualityExamples,
} from '@/pages/word-quiz/utils/selectQualityExamples'
import { todayLocalDate } from '@/utils/localDate'

export type ExamplePrefetchStatus = 'idle' | 'running' | 'paused'

export type ExamplePrefetchLogLevel = 'info' | 'success' | 'error'

export interface ExamplePrefetchLog {
  id: number
  at: number
  level: ExamplePrefetchLogLevel
  word?: string
  message: string
}

type PrefetchListener = (event: {
  status: ExamplePrefetchStatus
  done: number
  total: number
  currentWord?: string
  error?: string
}) => void

const DEFAULT_LIMIT = 20
/** 词与词之间的间隔，减轻本机 Ollama 压力 */
const GAP_MS = 1200
/** 控制台展示用环形日志上限 */
const LOG_LIMIT = 40

function sleep(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms))
}

async function wordNeedsAiExamples(word: string): Promise<boolean> {
  const key = word.trim().toLowerCase()
  if (!key) return false

  // 已有用户/AI 例句 → 不预生成（用户可手动再生成覆盖）
  const userExamples = await getUserExamplesForWord(key)
  if (userExamples.length > 0) return false

  const raw = await lookupLocalExamples(key)
  const curated = selectQualityExamples(key, raw)
  return !hasEnoughQualityExamples(curated)
}

/**
 * 后台静默为缺例句的单词预生成 AI 例句（写入 userExampleIndex）
 */
class ExamplePrefetchService {
  private status: ExamplePrefetchStatus = 'idle'
  private runId = 0
  private done = 0
  private total = 0
  private currentWord = ''
  private listeners = new Set<PrefetchListener>()
  private logs: ExamplePrefetchLog[] = []
  private logSeq = 0
  /** 避免 App 启动与导入同时踢两轮 */
  private kickTimer: ReturnType<typeof setTimeout> | null = null
  /** 运行中再次 kick 时，结束后自动再跑一轮 */
  private rerunAfter: { limit?: number } | null = null

  get snapshot() {
    return {
      status: this.status,
      done: this.done,
      total: this.total,
      currentWord: this.currentWord,
    }
  }

  /** 最近日志（新→旧），供控制台展示 */
  getLogs(): ExamplePrefetchLog[] {
    return this.logs.slice()
  }

  subscribe(listener: PrefetchListener): () => void {
    this.listeners.add(listener)
    listener({
      status: this.status,
      done: this.done,
      total: this.total,
      currentWord: this.currentWord || undefined,
    })
    return () => this.listeners.delete(listener)
  }

  private pushLog(level: ExamplePrefetchLogLevel, message: string, word?: string) {
    this.logSeq += 1
    this.logs.unshift({
      id: this.logSeq,
      at: Date.now(),
      level,
      word,
      message,
    })
    if (this.logs.length > LOG_LIMIT) {
      this.logs.length = LOG_LIMIT
    }
  }

  private emit(error?: string) {
    const event = {
      status: this.status,
      done: this.done,
      total: this.total,
      currentWord: this.currentWord || undefined,
      error,
    }
    for (const listener of this.listeners) {
      try {
        listener(event)
      } catch (err) {
        console.warn('[example-prefetch] listener error', err)
      }
    }
  }

  /** 防抖启动：导入后或 App 启动时调用 */
  kick(options?: { limit?: number; delayMs?: number }) {
    if (this.status === 'running') {
      this.rerunAfter = { limit: options?.limit }
      this.pushLog('info', '运行中，结束后将再补一轮')
      this.emit()
      return
    }
    if (this.kickTimer) clearTimeout(this.kickTimer)
    const delayMs = options?.delayMs ?? 2500
    this.pushLog('info', `已排队，${Math.round(delayMs / 1000)}s 后开始`)
    this.emit()
    this.kickTimer = setTimeout(() => {
      this.kickTimer = null
      this.start(options).catch((err) => {
        console.warn('[example-prefetch] start failed:', err)
      })
    }, delayMs)
  }

  stop() {
    this.runId += 1
    this.rerunAfter = null
    if (this.kickTimer) {
      clearTimeout(this.kickTimer)
      this.kickTimer = null
    }
    this.status = 'idle'
    this.currentWord = ''
    this.pushLog('info', '已停止')
    this.emit()
  }

  async start(options?: { limit?: number }): Promise<void> {
    if (this.status === 'running') {
      this.rerunAfter = { limit: options?.limit }
      this.pushLog('info', '运行中，结束后将再补一轮')
      this.emit()
      return
    }

    const apiConfig = await getApiConfig()
    if (
      !apiConfig?.baseUrl?.trim() ||
      !apiConfig.apiKey?.trim() ||
      !apiConfig.textModel?.trim()
    ) {
      console.info('[example-prefetch] skip: API not configured')
      this.pushLog('error', '跳过：API 未配置')
      this.emit('API 未配置')
      return
    }

    const currentRun = ++this.runId
    this.status = 'running'
    this.done = 0
    this.total = 0
    this.currentWord = ''
    this.pushLog('info', '开始扫描缺例句单词')
    this.emit()

    try {
      await ensureLocalDictionary()
      const words = await getAllWords()
      const candidates = await this.pickCandidates(words, options?.limit ?? DEFAULT_LIMIT)
      this.total = candidates.length
      this.emit()

      if (!candidates.length) {
        console.info('[example-prefetch] nothing to generate')
        this.status = 'idle'
        this.pushLog('info', '无需生成（例句已齐）')
        this.emit()
        this.maybeRerun()
        return
      }

      console.info(`[example-prefetch] queue ${candidates.length} words`)
      this.pushLog('info', `排队 ${candidates.length} 个词`)
      this.emit()

      for (const item of candidates) {
        if (currentRun !== this.runId) return

        this.currentWord = item.word
        this.emit()

        try {
          await generateQualityExamplesForWord(item.word, item.translation)
          this.done += 1
          this.pushLog('success', `完成 (${this.done}/${this.total})`, item.word)
          this.emit()
          console.info(`[example-prefetch] ok ${item.word} (${this.done}/${this.total})`)
        } catch (err) {
          // 单个失败不中断队列（小模型偶发 JSON 失败很常见）
          const reason = err instanceof Error ? err.message : '生成失败'
          console.warn(`[example-prefetch] fail ${item.word}:`, err)
          this.done += 1
          this.pushLog('error', reason.slice(0, 80), item.word)
          this.emit(reason)
        }

        if (currentRun !== this.runId) return
        await sleep(GAP_MS)
      }

      if (currentRun !== this.runId) return
      this.status = 'idle'
      this.currentWord = ''
      this.pushLog('info', `本轮结束 ${this.done}/${this.total}`)
      this.emit()
      console.info(`[example-prefetch] finished ${this.done}/${this.total}`)
      this.maybeRerun()
    } catch (err) {
      if (currentRun !== this.runId) return
      this.status = 'idle'
      this.currentWord = ''
      const reason = err instanceof Error ? err.message : '预生成失败'
      this.pushLog('error', reason.slice(0, 80))
      this.emit(reason)
      console.warn('[example-prefetch] aborted:', err)
      this.maybeRerun()
    }
  }

  private maybeRerun() {
    const next = this.rerunAfter
    if (!next) return
    this.rerunAfter = null
    window.setTimeout(() => {
      this.start(next).catch((err) => {
        console.warn('[example-prefetch] rerun failed:', err)
      })
    }, 800)
  }

  /** 今日词优先，再按加入时间倒序 */
  private async pickCandidates(
    words: VocabularyWord[],
    limit: number,
  ): Promise<Array<{ word: string; translation?: string }>> {
    const today = todayLocalDate()
    const seen = new Set<string>()
    const prioritized = [
      ...words.filter((w) => w.date === today),
      ...words.filter((w) => w.date !== today),
    ]

    const out: Array<{ word: string; translation?: string }> = []
    for (const item of prioritized) {
      const key = item.word.trim().toLowerCase()
      if (!key || seen.has(key)) continue
      seen.add(key)

      try {
        if (!(await wordNeedsAiExamples(key))) continue
      } catch (err) {
        console.warn('[example-prefetch] check failed:', key, err)
        continue
      }

      out.push({ word: item.word.trim(), translation: item.translation })
      if (out.length >= limit) break
    }
    return out
  }
}

export const examplePrefetchService = new ExamplePrefetchService()
