import {
  collectPendingWrongWords,
  getAllChoicePracticeStates,
  getRemainingWrongWords,
  markWordsPracticed,
  mergePendingWrongWords,
} from '@/db/repositories/choice-practice-state.repository'
import {
  getAllWords,
  getWordsByDateRange,
} from '@/db/repositories/words.repository'
import { shiftLocalDate, todayLocalDate } from '@/utils/localDate'

export type ReviewMode = 'range' | 'mixed'

export interface ReviewSessionConfig {
  mode: ReviewMode
  /** range 模式起止日；mixed 可忽略 */
  startDate: string
  endDate: string
  /** 一次抽多少个 */
  batchSize: number
}

export interface ReviewSessionPlan {
  words: string[]
  wrongCount: number
  poolSize: number
  mode: ReviewMode
}

const PREFS_KEY = 'review_session_prefs_v1'
const DEFAULT_BATCH = 10
export const REVIEW_BATCH_OPTIONS = [5, 10, 15, 20, 30] as const
export const REVIEW_BATCH_MIN = 1
export const REVIEW_BATCH_MAX = 100

export function clampReviewBatchSize(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_BATCH
  return Math.max(REVIEW_BATCH_MIN, Math.min(REVIEW_BATCH_MAX, Math.round(value)))
}

function normalize(word: string): string {
  return word.trim().toLowerCase()
}

function uniquePreserveOrder(words: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const raw of words) {
    const key = normalize(raw)
    if (!key || seen.has(key)) continue
    seen.add(key)
    result.push(raw.trim())
  }
  return result
}

function shuffleInPlace<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[items[i], items[j]] = [items[j]!, items[i]!]
  }
  return items
}

export function defaultReviewConfig(): ReviewSessionConfig {
  const today = todayLocalDate()
  return {
    mode: 'mixed',
    startDate: shiftLocalDate(today, -6),
    endDate: today,
    batchSize: DEFAULT_BATCH,
  }
}

export function loadReviewPrefs(): ReviewSessionConfig {
  const base = defaultReviewConfig()
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return base
    const parsed = JSON.parse(raw) as Partial<ReviewSessionConfig>
    const batchSize = Number(parsed.batchSize)
    return {
      mode: parsed.mode === 'range' ? 'range' : 'mixed',
      startDate: typeof parsed.startDate === 'string' && parsed.startDate
        ? parsed.startDate
        : base.startDate,
      endDate: typeof parsed.endDate === 'string' && parsed.endDate
        ? parsed.endDate
        : base.endDate,
      batchSize: clampReviewBatchSize(
        Number.isFinite(batchSize) ? batchSize : DEFAULT_BATCH,
      ),
    }
  } catch {
    return base
  }
}

export function saveReviewPrefs(config: ReviewSessionConfig): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(config))
  } catch {
    // ignore quota
  }
}

/**
 * 复习组卷：错题优先填满额度，不足再用范围内/全部学过的词补齐。
 */
export async function buildReviewSession(
  config: ReviewSessionConfig,
): Promise<ReviewSessionPlan> {
  const batchSize = clampReviewBatchSize(config.batchSize || DEFAULT_BATCH)
  const today = todayLocalDate()

  let poolEntries: { word: string; date: string }[] = []
  let wrongWords: string[] = []

  if (config.mode === 'range') {
    let start = config.startDate || shiftLocalDate(today, -6)
    let end = config.endDate || today
    if (start > end) [start, end] = [end, start]

    const ranged = await getWordsByDateRange(start, end)
    poolEntries = ranged.map((w) => ({ word: w.word, date: w.date }))
    wrongWords = await collectPendingWrongWords({ startDate: start, endDate: end })
  } else {
    const all = await getAllWords()
    poolEntries = all.map((w) => ({ word: w.word, date: w.date }))
    wrongWords = await collectPendingWrongWords()
  }

  const pool = uniquePreserveOrder(poolEntries.map((e) => e.word))
  const wrongs = uniquePreserveOrder(wrongWords)
  const wrongKeys = new Set(wrongs.map(normalize))
  const nonWrongPool = pool.filter((w) => !wrongKeys.has(normalize(w)))

  // 错题优先，再用普通词补齐额度；抽满后再打乱
  const ordered = uniquePreserveOrder([
    ...shuffleInPlace([...wrongs]),
    ...shuffleInPlace([...nonWrongPool]),
  ])

  const words = ordered.slice(0, batchSize)
  const selectedWrong = words.filter((w) => wrongKeys.has(normalize(w))).length

  return {
    words: shuffleInPlace([...words]),
    wrongCount: selectedWrong,
    poolSize: uniquePreserveOrder([...pool, ...wrongs]).length,
    mode: config.mode,
  }
}

/** 预估可选词量（设置页展示用） */
export async function estimateReviewPool(config: ReviewSessionConfig): Promise<{
  poolSize: number
  wrongCount: number
}> {
  const today = todayLocalDate()
  if (config.mode === 'range') {
    let start = config.startDate || shiftLocalDate(today, -6)
    let end = config.endDate || today
    if (start > end) [start, end] = [end, start]
    const ranged = await getWordsByDateRange(start, end)
    const wrongs = await collectPendingWrongWords({ startDate: start, endDate: end })
    const pool = uniquePreserveOrder([
      ...ranged.map((w) => w.word),
      ...wrongs,
    ])
    return { poolSize: pool.length, wrongCount: uniquePreserveOrder(wrongs).length }
  }

  const all = await getAllWords()
  const wrongs = await collectPendingWrongWords()
  const pool = uniquePreserveOrder([...all.map((w) => w.word), ...wrongs])
  return { poolSize: pool.length, wrongCount: uniquePreserveOrder(wrongs).length }
}

/**
 * 复习结算：答对的从各日错题池搁置；仍错的滚到练习日错题池。
 */
export async function settleReviewedWords(options: {
  practiceDate: string
  correctWords: string[]
  wrongWords: string[]
}): Promise<void> {
  const { practiceDate, correctWords, wrongWords } = options
  const correct = uniquePreserveOrder(correctWords)
  const wrong = uniquePreserveOrder(wrongWords)

  if (correct.length > 0) {
    const states = await getAllChoicePracticeStates()
    await Promise.all(
      states.map(async (state) => {
        const remaining = new Set(getRemainingWrongWords(state).map(normalize))
        const hit = correct.filter((w) => remaining.has(normalize(w)))
        if (hit.length > 0) {
          await markWordsPracticed(state.date, hit)
        }
      }),
    )
  }

  if (wrong.length > 0 && practiceDate.trim()) {
    // 先从各日池清掉，再写入今日，避免重复混入
    const states = await getAllChoicePracticeStates()
    await Promise.all(
      states.map(async (state) => {
        if (state.date === practiceDate) return
        const remaining = new Set(getRemainingWrongWords(state).map(normalize))
        const hit = wrong.filter((w) => remaining.has(normalize(w)))
        if (hit.length > 0) {
          await markWordsPracticed(state.date, hit)
        }
      }),
    )
    await mergePendingWrongWords(practiceDate, wrong)
  }
}
