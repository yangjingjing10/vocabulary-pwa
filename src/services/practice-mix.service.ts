import {
  getChoicePracticeState,
  getRemainingWrongWords,
  markWordsPracticed,
} from '@/db/repositories/choice-practice-state.repository'
import { shiftLocalDate } from '@/utils/localDate'

const MAX_REVIEW_MIX = 20

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

export interface PracticeWordMix {
  /** 当日词 + 混入的昨日错题（已打乱） */
  words: string[]
  /** 本次实际混入的昨日错题 */
  reviewWords: string[]
  /** 错题来源日（练习日的前一天） */
  reviewFromDate: string
}

/**
 * 练习组卷：在当日单词中自然混入「昨天」尚未消化的错题。
 * 不另开复习模式，用户仍走同一个练习入口。
 */
export async function mixYesterdayWrongWords(
  practiceDate: string,
  dayWords: string[],
): Promise<PracticeWordMix> {
  const date = practiceDate.trim()
  const base = uniquePreserveOrder(dayWords)
  if (!date) {
    return { words: shuffleInPlace([...base]), reviewWords: [], reviewFromDate: '' }
  }

  const reviewFromDate = shiftLocalDate(date, -1)
  const state = await getChoicePracticeState(reviewFromDate)
  const remaining = getRemainingWrongWords(state)

  const dayKeys = new Set(base.map(normalize))
  const reviewPool = remaining.filter((w) => !dayKeys.has(normalize(w)))
  const reviewWords = shuffleInPlace([...reviewPool]).slice(0, MAX_REVIEW_MIX)

  const words = shuffleInPlace([...base, ...reviewWords])

  return { words, reviewWords, reviewFromDate }
}

/**
 * 练习结束后：凡碰过的昨日错题都从昨日池清掉。
 * 仍错的会由默写流程写入「今日」错题池，次日再自然混入。
 */
export async function settleYesterdayReviewWords(
  practiceDate: string,
  touchedWords: string[],
): Promise<void> {
  const date = practiceDate.trim()
  if (!date || touchedWords.length === 0) return

  const reviewFromDate = shiftLocalDate(date, -1)
  const state = await getChoicePracticeState(reviewFromDate)
  const remainingKeys = new Set(getRemainingWrongWords(state).map(normalize))
  const hit = uniquePreserveOrder(touchedWords).filter((w) =>
    remainingKeys.has(normalize(w)),
  )
  if (hit.length === 0) return

  await markWordsPracticed(reviewFromDate, hit)
}
