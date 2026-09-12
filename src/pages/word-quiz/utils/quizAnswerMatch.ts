import { lookupLocalDictionary } from '@/services/local-dictionary.service'
import type { QuizDirection, QuizQuestion } from '../types/quiz'
import { shuffleArray } from './arrayUtils'

const POS_PREFIX_RE = /^([a-zA-Z]+\.?)\s+/
const DOMAIN_TAG_RE = /\[[^\]]+\]/g

/** 词典里常见字面量 \\n，统一成真实换行 */
function normalizeDictText(text: string): string {
  return text.replace(/\\n/g, '\n').replace(/\r\n/g, '\n')
}

/**
 * 清洗释义：换行、词性、学科标签，并拆成短义项
 */
export function splitCleanSenses(translation: string): string[] {
  const normalized = normalizeDictText(translation)
  const lines = normalized
    .split('\n')
    .map((line) =>
      line
        .replace(POS_PREFIX_RE, '')
        .replace(DOMAIN_TAG_RE, '')
        .trim(),
    )
    .filter(Boolean)

  const senses: string[] = []
  for (const line of lines) {
    for (const part of line.split(/[；;]/)) {
      for (const sense of part.split(/[，,、]/)) {
        const cleaned = sense.trim()
        if (cleaned && !senses.includes(cleaned)) {
          senses.push(cleaned)
        }
      }
    }
  }
  return senses
}

/** 取释义首条可用中文义项（用于对照答案展示） */
export function extractPrimaryGloss(translation: string): string {
  return splitCleanSenses(translation)[0] || ''
}

/**
 * 展示用提示：中→英只出 1～2 个短义项，避免整段词典原文
 */
export function getQuestionPrompt(
  question: Pick<QuizQuestion, 'word' | 'translation' | 'direction'>,
): string {
  if (question.direction === 'zh-to-en') {
    const senses = splitCleanSenses(question.translation)
    if (senses.length === 0) {
      return question.translation.replace(/\\n/g, ' ').trim()
    }
    // 优先短义项，最多两个，总长控制在约 12 字内更舒服
    const picked: string[] = []
    let length = 0
    for (const sense of senses) {
      if (picked.length >= 2) break
      if (sense.length > 10 && picked.length > 0) break
      if (length + sense.length > 14 && picked.length > 0) break
      picked.push(sense)
      length += sense.length
    }
    return picked.join(' · ')
  }
  return question.word
}

export function getCorrectAnswer(question: Pick<QuizQuestion, 'word' | 'translation' | 'direction'>): string {
  if (question.direction === 'en-to-zh') {
    return extractPrimaryGloss(question.translation) || question.translation
  }
  return question.word
}

function normalizeEn(text: string): string {
  return text.toLowerCase().trim().replace(/[.,!?;:"'()[\]{}]/g, '')
}

function normalizeZh(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[.,，。；;、·•"'‘’“”()（）[\]【】]/g, '')
    .replace(POS_PREFIX_RE, '')
}

function splitChineseSenses(translation: string): string[] {
  return splitCleanSenses(translation).map(normalizeZh).filter((s) => s.length > 0)
}

export function matchEnglishAnswer(userAnswer: string, word: string): boolean {
  const user = normalizeEn(userAnswer)
  const target = normalizeEn(word)
  return Boolean(user) && user === target
}

export function matchChineseAnswer(userAnswer: string, translation: string): boolean {
  const user = normalizeZh(userAnswer)
  if (!user) return false

  const senses = splitChineseSenses(translation)
  if (senses.length === 0) return false

  return senses.some((sense) => {
    if (sense === user) return true
    // 用户写了更短/更长的同义片段也算对（避免过短误伤：至少 1 个汉字）
    if (user.length >= 1 && sense.includes(user)) return true
    if (sense.length >= 2 && user.includes(sense)) return true
    return false
  })
}

export function checkQuizAnswer(
  question: Pick<QuizQuestion, 'word' | 'translation' | 'direction'>,
  userAnswer: string,
): boolean {
  const answer = userAnswer.trim()
  if (!answer) return false

  if (question.direction === 'zh-to-en') {
    return matchEnglishAnswer(answer, question.word)
  }
  return matchChineseAnswer(answer, question.translation)
}

/** 初始化时批量补齐释义 */
export async function resolveTranslations(words: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  await Promise.all(
    words.map(async (word) => {
      const entry = await lookupLocalDictionary(word)
      const gloss = extractPrimaryGloss(entry?.translation || '')
      if (gloss) {
        map.set(word, entry!.translation || gloss)
      } else if (entry?.translation) {
        map.set(word, entry.translation)
      }
    }),
  )
  return map
}

export function assignDirectionsFiftyFifty(
  items: { word: string; translation: string }[],
): { word: string; translation: string; direction: QuizDirection }[] {
  const withGloss = items.filter((i) => extractPrimaryGloss(i.translation))
  const withoutGloss = items.filter((i) => !extractPrimaryGloss(i.translation))

  const shuffled = shuffleArray([...withGloss])
  const mid = Math.floor(shuffled.length / 2)

  const assigned: { word: string; translation: string; direction: QuizDirection }[] = [
    ...shuffled.slice(0, mid).map((i) => ({ ...i, direction: 'en-to-zh' as const })),
    ...shuffled.slice(mid).map((i) => ({ ...i, direction: 'zh-to-en' as const })),
    // 无释义时只能出英→中，正确答案暂空，判题会失败（极少数）
    ...withoutGloss.map((i) => ({ ...i, direction: 'en-to-zh' as const })),
  ]

  return shuffleArray(assigned)
}
