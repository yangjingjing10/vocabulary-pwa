import { initDatabase } from '../index'
import type { ChoicePracticeState } from '../schema/database'

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

function emptyState(date: string): ChoicePracticeState {
  return {
    id: date,
    date,
    pendingWrongWords: [],
    practicedWords: [],
    updatedAt: Date.now(),
  }
}

export async function getChoicePracticeState(date: string): Promise<ChoicePracticeState> {
  const db = await initDatabase()
  const existing = await db.get('choicePracticeStates', date)
  return existing ?? emptyState(date)
}

/**
 * 合并新的错词到待练列表（已练习过的不会再加入）
 */
export async function mergePendingWrongWords(
  date: string,
  wrongWords: string[],
): Promise<ChoicePracticeState> {
  const db = await initDatabase()
  const current = (await db.get('choicePracticeStates', date)) ?? emptyState(date)
  const practiced = new Set(current.practicedWords.map(normalize))

  const mergedPending = uniquePreserveOrder([
    ...current.pendingWrongWords,
    ...wrongWords.filter((w) => !practiced.has(normalize(w))),
  ]).filter((w) => !practiced.has(normalize(w)))

  const next: ChoicePracticeState = {
    ...current,
    pendingWrongWords: mergedPending,
    updatedAt: Date.now(),
  }
  await db.put('choicePracticeStates', next)
  return next
}

/**
 * 完成本批练习：把用过的词标为已练，并从待练错词中移除
 */
export async function markWordsPracticed(
  date: string,
  words: string[],
): Promise<ChoicePracticeState> {
  const db = await initDatabase()
  const current = (await db.get('choicePracticeStates', date)) ?? emptyState(date)
  const practicedKeys = new Set(current.practicedWords.map(normalize))
  const newlyPracticed = uniquePreserveOrder(words)

  for (const w of newlyPracticed) {
    practicedKeys.add(normalize(w))
  }

  const practicedWords = uniquePreserveOrder([
    ...current.practicedWords,
    ...newlyPracticed,
  ])

  const pendingWrongWords = current.pendingWrongWords.filter(
    (w) => !practicedKeys.has(normalize(w)),
  )

  const next: ChoicePracticeState = {
    ...current,
    practicedWords,
    pendingWrongWords,
    updatedAt: Date.now(),
  }
  await db.put('choicePracticeStates', next)
  return next
}

/** 尚未练习的待练错词 */
export function getRemainingWrongWords(state: ChoicePracticeState): string[] {
  const practiced = new Set(state.practicedWords.map(normalize))
  return state.pendingWrongWords.filter((w) => !practiced.has(normalize(w)))
}

export async function clearChoicePracticeStates(): Promise<void> {
  const db = await initDatabase()
  await db.clear('choicePracticeStates')
}
