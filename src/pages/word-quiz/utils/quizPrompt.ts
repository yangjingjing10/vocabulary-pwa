import {
  lookupLocalExamples,
  lookupLocalPhrases,
} from '@/services/local-dictionary.service'
import type { QuizPromptMode } from '../types/quiz'
import { shuffleArray } from './arrayUtils'

export interface QuizPromptPick {
  mode: QuizPromptMode
  text: string
}

/**
 * 为单词抽取题干：单词 / 固定搭配 / 例句 三选一（仅在有素材时纳入）
 */
export async function pickQuizPrompt(
  word: string,
  options?: { preferNot?: QuizPromptMode },
): Promise<QuizPromptPick> {
  const key = word.trim()
  const [phrases, examples] = await Promise.all([
    lookupLocalPhrases(key),
    lookupLocalExamples(key),
  ])

  const candidates: QuizPromptPick[] = [{ mode: 'word', text: key }]

  if (phrases.length > 0) {
    const phrase = phrases[Math.floor(Math.random() * phrases.length)]!
    candidates.push({ mode: 'phrase', text: phrase.phrase })
  }

  if (examples.length > 0) {
    const example = examples[Math.floor(Math.random() * examples.length)]!
    candidates.push({ mode: 'example', text: example.sentence })
  }

  const preferNot = options?.preferNot
  const filtered =
    preferNot && candidates.length > 1
      ? candidates.filter((c) => c.mode !== preferNot)
      : candidates

  const pool = filtered.length > 0 ? filtered : candidates
  return pool[Math.floor(Math.random() * pool.length)]!
}

/** 批量抽题干（打乱顺序后各自独立抽模式） */
export async function pickQuizPrompts(
  words: string[],
): Promise<Map<string, QuizPromptPick>> {
  const map = new Map<string, QuizPromptPick>()
  await Promise.all(
    words.map(async (word) => {
      map.set(word, await pickQuizPrompt(word))
    }),
  )
  return map
}

export function shuffleWords<T>(items: T[]): T[] {
  return shuffleArray(items)
}
