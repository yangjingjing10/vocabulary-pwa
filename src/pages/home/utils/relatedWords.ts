export type RelatedReason = 'lookalike' | 'root' | 'sense'

export interface RelatedSourceWord {
  word: string
  phonetic?: string
  translation?: string
  pos?: string
}

export interface RelatedWordHit {
  word: string
  phonetic?: string
  translation?: string
  pos?: string
  reason: RelatedReason
  reasonLabel: string
  /** 若来自当日词表，可跳转 */
  index?: number
}

/** 派生后缀：只用于「真同根」判断，不再做 -er 一类的同缀乱配 */
const DERIVATIONAL_SUFFIXES = [
  'ization', 'isation', 'ation', 'ition', 'tion', 'sion', 'ness', 'ment',
  'able', 'ible', 'ous', 'ious', 'ive', 'ful', 'less', 'ally', 'ing',
  'ers', 'ies', 'ied', 'ely', 'ly', 'al', 'ed', 'es', 's',
]

function normalizeLemma(word: string): string {
  return word.toLowerCase().trim().replace(/[.,!?;:"'()[\]{}]/g, '')
}

/**
 * 词干：只剥派生后缀，且剥完后词干至少 4 字母。
 * 避免 water→wat、number→numb 这类误伤。
 */
export function roughStem(word: string): string {
  let w = normalizeLemma(word)
  if (w.length < 5) return w
  for (const s of DERIVATIONAL_SUFFIXES) {
    // 故意不剥单独的 er/or（agent 名词尾），否则 water/father 会假同根
    if (s === 'er' || s === 'or') continue
    if (w.length - s.length >= 4 && w.endsWith(s)) {
      let stem = w.slice(0, -s.length)
      if (
        stem.length >= 4 &&
        stem[stem.length - 1] === stem[stem.length - 2] &&
        /[bcdfghjklmnpqrstvwxyz]/.test(stem[stem.length - 1] || '')
      ) {
        stem = stem.slice(0, -1)
      }
      if (stem.length >= 4) return stem
    }
  }
  return w
}

/** 编辑距离（带上限提前退出） */
export function editDistance(a: string, b: string, maxDist = 2): number {
  if (a === b) return 0
  const la = a.length
  const lb = b.length
  if (Math.abs(la - lb) > maxDist) return maxDist + 1

  // 滚动数组
  let prev = new Array(lb + 1)
  let curr = new Array(lb + 1)
  for (let j = 0; j <= lb; j++) prev[j] = j

  for (let i = 1; i <= la; i++) {
    curr[0] = i
    let rowMin = curr[0]
    const ca = a.charCodeAt(i - 1)
    for (let j = 1; j <= lb; j++) {
      const cost = ca === b.charCodeAt(j - 1) ? 0 : 1
      const v = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
      curr[j] = v
      if (v < rowMin) rowMin = v
    }
    if (rowMin > maxDist) return maxDist + 1
    ;[prev, curr] = [curr, prev]
  }
  return prev[lb]
}

/**
 * 形近：像 adapt / adopt / adept
 * - 短词只允许改 1 个字母
 * - 更长词允许改 1～2 个，且长度接近
 */
export function isLookalike(aRaw: string, bRaw: string): boolean {
  const a = normalizeLemma(aRaw)
  const b = normalizeLemma(bRaw)
  if (!a || !b || a === b) return false
  const lenDiff = Math.abs(a.length - b.length)
  if (lenDiff > 2) return false

  const maxLen = Math.max(a.length, b.length)
  if (maxLen <= 3) return editDistance(a, b, 1) <= 1
  if (maxLen <= 5) return editDistance(a, b, 1) <= 1
  // 6+：允许距离 2，但至少一个共同前缀或后缀线索，减少 random 碰撞
  const dist = editDistance(a, b, 2)
  if (dist > 2) return false
  if (dist <= 1) return true
  // dist === 2：要求共享连续 3 字母，或相同首字母且长度相同
  if (a[0] === b[0] && a.length === b.length) return true
  return hasCommonTrigram(a, b)
}

function hasCommonTrigram(a: string, b: string): boolean {
  if (a.length < 3 || b.length < 3) return false
  const set = new Set<string>()
  for (let i = 0; i <= a.length - 3; i++) set.add(a.slice(i, i + 3))
  for (let i = 0; i <= b.length - 3; i++) {
    if (set.has(b.slice(i, i + 3))) return true
  }
  return false
}

/** 拆中文释义义项（要求整项重合，避免单字「的」之类） */
export function glossTokens(translation: string | undefined): Set<string> {
  if (!translation) return new Set()
  const text = translation.replace(/\\n/g, '\n')
  const parts = text.split(/[,，;；、/\n|]+/)
  const out = new Set<string>()
  for (const part of parts) {
    let s = part.trim()
    s = s.replace(/^\[[^\]]+\]\s*/g, '')
    s = s.replace(/^(n|v|vt|vi|a|adj|adv|ad|prep|conj|pron|num|int|aux|art|pl)\.\s*/i, '')
    s = s.replace(/[（(][^）)]*[）)]/g, '').trim()
    if (s.length >= 2 && !/^[a-z.]+$/i.test(s)) out.add(s)
  }
  return out
}

function shareSense(a: Set<string>, b: Set<string>): boolean {
  for (const t of a) {
    if (b.has(t)) return true
  }
  return false
}

function shareRoot(a: string, b: string): boolean {
  const sa = roughStem(a)
  const sb = roughStem(b)
  if (sa.length < 4 || sb.length < 4) return false
  if (sa === sb) return true
  const [short, long] = sa.length <= sb.length ? [sa, sb] : [sb, sa]
  // action / active：词干需足够长
  if (short.length >= 4 && long.startsWith(short) && long.length - short.length <= 4) return true
  return false
}

const REASON_LABEL: Record<RelatedReason, string> = {
  lookalike: '形近',
  root: '同根',
  sense: '近义',
}

/**
 * 从当日词表找相近词：优先形近（adapt/adopt），再同根、近义。
 * 已去掉「同缀」匹配（会把 water 配到 father）。
 */
export function findRelatedInList(
  current: RelatedSourceWord,
  list: RelatedSourceWord[],
  currentIndex: number,
  limit = 12,
): RelatedWordHit[] {
  const curWord = normalizeLemma(current.word)
  if (!curWord) return []
  const curGloss = glossTokens(current.translation)
  const hits: RelatedWordHit[] = []
  const seen = new Set<string>([curWord])

  for (let i = 0; i < list.length; i++) {
    if (i === currentIndex) continue
    const item = list[i]
    const w = normalizeLemma(item.word)
    if (!w || seen.has(w)) continue

    let reason: RelatedReason | null = null
    if (isLookalike(curWord, w)) reason = 'lookalike'
    else if (shareRoot(curWord, w)) reason = 'root'
    else if (shareSense(curGloss, glossTokens(item.translation))) reason = 'sense'

    if (!reason) continue
    seen.add(w)
    hits.push({
      word: item.word,
      phonetic: item.phonetic,
      translation: item.translation,
      pos: item.pos,
      reason,
      reasonLabel: REASON_LABEL[reason],
      index: i,
    })
    if (hits.length >= limit) break
  }

  const order: Record<RelatedReason, number> = { lookalike: 0, root: 1, sense: 2 }
  hits.sort((a, b) => order[a.reason] - order[b.reason] || a.word.localeCompare(b.word))
  return hits
}

export { REASON_LABEL }
