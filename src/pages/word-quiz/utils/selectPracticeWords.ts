/**
 * 选择题抽词：每批最多 10 个，优先未练过的错题；不重复已练单词。
 *
 * - 剩余错题 > 10：只抽 10 个错题
 * - 剩余错题 ≤ 10：错题全用，并用其余未练单词补满 10（词池不够则有多少用多少）
 * - 无错题且允许补全：从词池抽最多 10 个未练词
 */

export interface SelectPracticeWordsOptions {
  /** 优先抽取的错词 */
  prioritize?: string[]
  /** 已练习过、不可再出的词 */
  exclude?: string[]
  /** 每批上限，默认 10 */
  batchSize?: number
  /**
   * 错题不足 batchSize 时是否用其余词补全。
   * 续练仅剩少量错题时仍可补全；无错题且 fillFromPool=false 则返回空。
   */
  fillFromPool?: boolean
}

function normalize(word: string): string {
  return word.trim().toLowerCase()
}

function uniqueWords(words: string[]): string[] {
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

function shuffle<T>(list: T[]): T[] {
  const arr = [...list]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * 从词池抽本批练习单词
 */
export function selectPracticeWords(
  pool: string[],
  options: SelectPracticeWordsOptions = {},
): string[] {
  const batchSize = options.batchSize ?? 10
  const fillFromPool = options.fillFromPool ?? true
  const excludeKeys = new Set((options.exclude ?? []).map(normalize).filter(Boolean))

  const availablePool = uniqueWords(pool).filter((w) => !excludeKeys.has(normalize(w)))
  if (availablePool.length === 0) return []

  const prioritizeKeys = new Set(
    (options.prioritize ?? []).map(normalize).filter(Boolean),
  )

  const preferred = shuffle(
    availablePool.filter((w) => prioritizeKeys.has(normalize(w))),
  )
  const others = shuffle(
    availablePool.filter((w) => !prioritizeKeys.has(normalize(w))),
  )

  // 剩余错题超过一批：只出一批错题，不补其它词
  if (preferred.length > batchSize) {
    return preferred.slice(0, batchSize)
  }

  const selected: string[] = [...preferred]

  if (fillFromPool) {
    for (const word of others) {
      if (selected.length >= batchSize) break
      selected.push(word)
    }
  }

  return shuffle(selected)
}
