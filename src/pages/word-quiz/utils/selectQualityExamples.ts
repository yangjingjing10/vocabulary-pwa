import type { LocalExampleItem } from '@/db/schema/database'
import { expandWordForms } from './highlightWord'

/** 展示用精选条数上限 */
export const QUALITY_EXAMPLE_LIMIT = 3

/** 至少几条高质量例句才算「够用」（不够则提示 AI 生成） */
export const QUALITY_EXAMPLE_ENOUGH = 2

const WEAK_STARTERS =
  /^(i|you|he|she|we|they|it|this|that|there|here)\b/i

/**
 * 给本地 Tatoeba 例句打分：偏教学向（有中译、中等长度、目标词核心、可推义）
 */
export function scoreQualityExample(
  word: string,
  item: LocalExampleItem,
): number {
  const sentence = (item.sentence || '').trim()
  const translation = (item.translation || '').trim()
  if (!sentence) return -999

  let score = 0
  if (translation) score += 80
  else score -= 40

  const len = sentence.length
  if (len >= 35 && len <= 100) score += 25
  else if (len >= 25 && len <= 120) score += 12
  else if (len < 20 || len > 140) score -= 20

  const tokens = sentence.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) || []
  const wordCount = tokens.length
  if (wordCount >= 6 && wordCount <= 16) score += 18
  else if (wordCount >= 4 && wordCount <= 20) score += 8
  else score -= 10

  const forms = new Set(expandWordForms(word).map((f) => f.toLowerCase()))
  const hitIndexes = tokens
    .map((t, i) => (forms.has(t) ? i : -1))
    .filter((i) => i >= 0)

  if (hitIndexes.length === 0) score -= 50
  else {
    score += 15
    // 目标词偏句中/前半更利于推义，句末附带出现略扣分
    const firstHit = hitIndexes[0]!
    const ratio = firstHit / Math.max(wordCount - 1, 1)
    if (ratio <= 0.55) score += 10
    else if (ratio >= 0.85) score -= 8
  }

  const caps = (sentence.match(/\b[A-Z][a-z]{2,}\b/g) || []).length
  if (caps >= 4) score -= 12
  else if (caps <= 1) score += 4

  // 过短的人称开头口语句，语境信息通常不足
  if (WEAK_STARTERS.test(sentence) && wordCount <= 7) score -= 15

  // 问句、感叹句信息密度常偏低
  if (/\?\s*$/.test(sentence)) score -= 6

  return score
}

/**
 * 精选高质量例句；过滤明显低质，按分排序截断
 */
export function selectQualityExamples(
  word: string,
  examples: LocalExampleItem[],
  limit = QUALITY_EXAMPLE_LIMIT,
): LocalExampleItem[] {
  const scored = examples
    .map((item) => ({ item, score: scoreQualityExample(word, item) }))
    .filter((row) => row.score >= 40)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.item.sentence.length - b.item.sentence.length,
    )

  const seen = new Set<string>()
  const out: LocalExampleItem[] = []
  for (const row of scored) {
    const key = row.item.sentence.toLowerCase().trim()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(row.item)
    if (out.length >= limit) break
  }
  return out
}

export function hasEnoughQualityExamples(examples: LocalExampleItem[]): boolean {
  return examples.filter((e) => e.translation?.trim()).length >= QUALITY_EXAMPLE_ENOUGH
}
