import { computed, ref } from 'vue'
import { addArticle } from '@/db/repositories/articles.repository'
import { getApiConfig } from '@/db/repositories/api-config.repository'
import { getActivePromptConfig } from '@/db/repositories/prompt-config.repository'
import type { Article, ArticleSourceRef } from '@/db/schema/database'
import { todayLocalDate } from '@/utils/localDate'
import {
  DEFAULT_ARTICLE_GEN_PREFS,
  SAFETY_MAX_ARTICLES,
  splitWordsEvenly,
  type ArticleGenPrefs,
} from '@/constants/article-gen-prefs'

export type ArticleGenStatus = 'idle' | 'generating' | 'success' | 'error'

type Listener = (event: {
  status: ArticleGenStatus
  article?: Article
  error?: string
  words: string[]
}) => void

const TARGET_BODY_WORDS_MIN = 70
const TARGET_BODY_WORDS_MAX = 140

function formatContentAsParagraphs(raw: string): string {
  if (raw.includes('<p>')) return raw
  return raw
    .split('\n\n')
    .filter((para) => para.trim())
    .map((para) => `<p>${para.trim()}</p>`)
    .join('\n')
}

function highlightWords(body: string, words: string[]): string {
  let result = body
  words.forEach((word) => {
    const regex = new RegExp(`\\b(${word})\\b`, 'gi')
    result = result.replace(regex, '<mark>$1</mark>')
  })
  return result
}

function buildSystemPrompt(promptConfig: { content?: string } | null | undefined) {
  if (promptConfig?.content) return promptConfig.content
  return `You are an expert English teacher writing short themed articles for vocabulary learners.

Rules:
- About ${TARGET_BODY_WORDS_MIN}-${TARGET_BODY_WORDS_MAX} English words, 1–3 short paragraphs.
- YOU choose the theme that best fits the assigned vocabulary (technology, education, daily life, etc.).
- Use the assigned words naturally; do not awkwardly dump them.
- Do not invent news outlets or URLs.
- Response format:
  Line 1: title
  Then: article body only
  Then: THEME: <short theme label>
  Then: USED: word1, word2, word3`
}

function buildChunkUserPrompt(
  assignedWords: string[],
  batchIndex: number,
  totalBatches: number,
) {
  return `Write themed brief ${batchIndex}/${totalBatches} for vocabulary learners.

These words are PRE-ASSIGNED to this article only (use as many as fit naturally; prefer covering them):
${assignedWords.join(', ')}

Task:
1. Decide the best theme yourself based on these words (do not ask the user).
2. Write ${TARGET_BODY_WORDS_MIN}-${TARGET_BODY_WORDS_MAX} English words (1–3 paragraphs) on that theme.
3. Incorporate the assigned words naturally. If a word truly cannot fit, you may skip it.
4. First line = title.
5. After body:
THEME: <3–6 word theme you chose>
USED: word1, word2, ... (only from the assigned list)

Do not write a Sources section.`
}

function parseUsedWords(content: string, pool: string[]): string[] {
  const poolLower = new Map(pool.map((w) => [w.toLowerCase(), w]))
  const usedLine = content
    .split('\n')
    .map((l) => l.trim())
    .reverse()
    .find((l) => /^USED:\s*/i.test(l))

  const found: string[] = []
  const seen = new Set<string>()

  if (usedLine) {
    const raw = usedLine.replace(/^USED:\s*/i, '')
    for (const part of raw.split(/[,，;；]+/)) {
      const key = part.trim().toLowerCase()
      const original = poolLower.get(key)
      if (original && !seen.has(key)) {
        seen.add(key)
        found.push(original)
      }
    }
  }

  if (found.length) return found

  const body = content.replace(/^(USED|THEME):\s*.*$/gim, '')
  for (const word of pool) {
    const re = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    if (re.test(body) && !seen.has(word.toLowerCase())) {
      seen.add(word.toLowerCase())
      found.push(word)
    }
  }
  return found.length ? found : [...pool]
}

function parseTheme(content: string): string {
  const line = content
    .split('\n')
    .map((l) => l.trim())
    .find((l) => /^THEME:\s*/i.test(l))
  if (!line) return ''
  return line.replace(/^THEME:\s*/i, '').trim().slice(0, 48)
}

function stripMetaLines(content: string): string {
  let text = content
    .split('\n')
    .filter((line) => {
      const t = line.trim()
      if (/^USED:\s*/i.test(t)) return false
      if (/^THEME:\s*/i.test(t)) return false
      if (/^SOURCES:\s*/i.test(t)) return false
      if (/^https?:\/\/\S+$/i.test(t)) return false
      return true
    })
    .join('\n')
  text = text.replace(/https?:\/\/[^\s)\]>]+/gi, '')
  return text.trim()
}

class ArticleGenerationService {
  readonly status = ref<ArticleGenStatus>('idle')
  readonly lastError = ref('')
  readonly lastArticle = ref<Article | null>(null)
  readonly lastWords = ref<string[]>([])
  readonly sessionArticles = ref<Article[]>([])
  readonly batchProgress = ref({ done: 0, remaining: 0, totalWords: 0 })

  private listeners = new Set<Listener>()
  private runId = 0

  readonly isGenerating = computed(() => this.status.value === 'generating')

  subscribe(listener: Listener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private emit() {
    const payload = {
      status: this.status.value,
      article: this.lastArticle.value ?? undefined,
      error: this.lastError.value || undefined,
      words: [...this.lastWords.value],
    }
    this.listeners.forEach((fn) => fn(payload))
  }

  clearSession() {
    this.sessionArticles.value = []
    this.batchProgress.value = { done: 0, remaining: 0, totalWords: 0 }
  }

  removeFromSession(id: string) {
    this.sessionArticles.value = this.sessionArticles.value.filter((article) => article.id !== id)
  }

  /**
   * batch-theme（默认）：先按篇数均分单词，再逐篇生成；题材由 AI 自定。
   * single：一篇塞全部词。
   */
  async start(
    words: string[],
    options: {
      appendToSession?: boolean
      session?: 'append' | 'replace' | 'none'
      date?: string
      mode?: 'batch-theme' | 'batch-news' | 'single'
      prefs?: Partial<ArticleGenPrefs>
    } = {},
  ): Promise<Article | null> {
    const plainWords = Array.from(
      new Set(Array.from(words ?? [], (word) => String(word).trim()).filter(Boolean)),
    )
    if (!plainWords.length) {
      this.status.value = 'error'
      this.lastError.value = '未选择单词'
      this.emit()
      return null
    }

    if (this.status.value === 'generating') {
      return null
    }

    const articleCount = Math.max(
      1,
      Math.min(
        SAFETY_MAX_ARTICLES,
        Number(options.prefs?.articleCount ?? DEFAULT_ARTICLE_GEN_PREFS.articleCount) || 5,
      ),
    )

    const sessionMode: 'append' | 'replace' | 'none' =
      options.session ?? (options.appendToSession === false ? 'replace' : 'append')
    if (sessionMode === 'replace') {
      this.sessionArticles.value = []
    }

    const mode = options.mode === 'single' ? 'single' : 'batch-theme'
    const currentRun = ++this.runId
    this.status.value = 'generating'
    this.lastError.value = ''
    this.lastWords.value = plainWords
    this.batchProgress.value = {
      done: 0,
      remaining: plainWords.length,
      totalWords: plainWords.length,
    }
    this.emit()

    try {
      const apiConfig = await getApiConfig()
      const promptConfig = await getActivePromptConfig()

      if (!apiConfig?.apiKey) {
        throw new Error('请先配置 API Key')
      }

      const baseUrl = apiConfig.baseUrl.trim().replace(/\/+$/, '')
      const date = options.date || todayLocalDate()

      if (mode === 'single') {
        const article = await this.generateOne({
          currentRun,
          baseUrl,
          apiKey: apiConfig.apiKey,
          model: apiConfig.textModel,
          systemPrompt: buildSystemPrompt(promptConfig),
          userPrompt: this.buildLegacyUserPrompt(plainWords),
          highlightPool: plainWords,
          storeWords: plainWords,
          date,
          theme: undefined,
          sessionMode,
        })
        if (currentRun !== this.runId) return article
        this.status.value = 'success'
        this.batchProgress.value = { done: 1, remaining: 0, totalWords: plainWords.length }
        this.emit()
        return article
      }

      const chunks = splitWordsEvenly(plainWords, articleCount)
      if (!chunks.length) {
        throw new Error('无法分配单词')
      }

      let lastArticle: Article | null = null
      let consumed = 0

      for (let i = 0; i < chunks.length; i++) {
        if (currentRun !== this.runId) return lastArticle

        const chunk = chunks[i]
        this.batchProgress.value = {
          done: i,
          remaining: plainWords.length - consumed,
          totalWords: plainWords.length,
        }
        this.emit()

        const raw = await this.callLlm({
          baseUrl,
          apiKey: apiConfig.apiKey,
          model: apiConfig.textModel,
          systemPrompt: buildSystemPrompt(promptConfig),
          userPrompt: buildChunkUserPrompt(chunk, i + 1, chunks.length),
        })

        let used = parseUsedWords(raw, chunk)
        if (!used.length) used = [...chunk]

        const theme = parseTheme(raw) || undefined

        const article = await this.persistParsedArticle({
          content: stripMetaLines(raw),
          highlightPool: used,
          storeWords: used,
          date,
          theme,
          sources: undefined,
          sessionMode: i === 0 && sessionMode === 'replace' ? 'replace' : 'append',
        })

        if (currentRun !== this.runId) return article
        lastArticle = article
        this.lastArticle.value = article
        consumed += chunk.length

        this.batchProgress.value = {
          done: i + 1,
          remaining: Math.max(0, plainWords.length - consumed),
          totalWords: plainWords.length,
        }
        this.emit()
      }

      if (currentRun !== this.runId) return lastArticle
      this.status.value = 'success'
      this.emit()
      return lastArticle
    } catch (error) {
      if (currentRun !== this.runId) return null
      this.status.value = 'error'
      this.lastError.value = error instanceof Error ? error.message : '生成失败'
      this.emit()
      console.error('[article-gen]', error)
      return null
    }
  }

  private buildLegacyUserPrompt(words: string[]) {
    const wordCount = Math.max(200, Math.min(800, words.length * 40))
    return `Write an approximately ${wordCount}-word article that naturally incorporates these vocabulary words: ${words.join(', ')}.

Choose an appropriate theme based on the vocabulary provided. Make the article engaging, coherent, and educational. Use each word naturally in context.`
  }

  private async callLlm(params: {
    baseUrl: string
    apiKey: string
    model: string
    systemPrompt: string
    userPrompt: string
  }): Promise<string> {
    const response = await fetch(`${params.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: params.model,
        messages: [
          { role: 'system', content: params.systemPrompt },
          { role: 'user', content: params.userPrompt },
        ],
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      throw new Error(`API 请求失败：${response.status}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) {
      throw new Error('AI 未返回内容')
    }
    return String(content)
  }

  private async persistParsedArticle(params: {
    content: string
    highlightPool: string[]
    storeWords: string[]
    date: string
    theme?: string
    sources?: ArticleSourceRef[]
    sessionMode: 'append' | 'replace' | 'none'
  }): Promise<Article> {
    const lines = params.content
      .split('\n')
      .filter((line: string) => line.trim())
    const articleTitle = (lines[0] || 'Untitled').replace(/^#+\s*/, '')
    let articleBody = lines.slice(1).join('\n\n')
    articleBody = highlightWords(articleBody, params.highlightPool)
    articleBody = formatContentAsParagraphs(articleBody)

    const article: Article = {
      id: `article-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: articleTitle,
      content: articleBody,
      words: [...params.storeWords],
      date: params.date,
      createdAt: Date.now(),
      kind: 'ai',
      theme: params.theme,
      sources: params.sources?.length ? params.sources : undefined,
    }

    await addArticle(article)

    if (params.sessionMode === 'append') {
      this.sessionArticles.value = [article, ...this.sessionArticles.value]
    } else if (params.sessionMode === 'replace') {
      this.sessionArticles.value = [article]
    }

    return article
  }

  private async generateOne(params: {
    currentRun: number
    baseUrl: string
    apiKey: string
    model: string
    systemPrompt: string
    userPrompt: string
    highlightPool: string[]
    storeWords: string[]
    date: string
    theme?: string
    sessionMode: 'append' | 'replace' | 'none'
  }): Promise<Article> {
    const content = await this.callLlm({
      baseUrl: params.baseUrl,
      apiKey: params.apiKey,
      model: params.model,
      systemPrompt: params.systemPrompt,
      userPrompt: params.userPrompt,
    })
    const article = await this.persistParsedArticle({
      content: stripMetaLines(content),
      highlightPool: params.highlightPool,
      storeWords: params.storeWords,
      date: params.date,
      theme: params.theme,
      sessionMode: params.sessionMode,
    })
    if (params.currentRun === this.runId) {
      this.lastArticle.value = article
    }
    return article
  }
}

export const articleGenerationService = new ArticleGenerationService()
