/**
 * 从 ECDICT CSV 生成：
 * 1) 精简词库 public/dict/ecdict-core.json
 * 2) 短语反查包 public/dict/ecdict-phrases.json（单词 → 相关短语+中文释义）
 *
 * 用法:
 *   node scripts/build-ecdict-core.mjs "D:/path/ecdict.csv"
 *   node scripts/build-ecdict-core.mjs "D:/path/ecdict.csv" --limit=50000
 *   node scripts/build-ecdict-core.mjs "D:/path/ecdict.csv" --phrase-limit=30000 --per-word=8
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const outCorePath = path.join(root, 'public', 'dict', 'ecdict-core.json')
const outPhrasePath = path.join(root, 'public', 'dict', 'ecdict-phrases.json')

const csvPath = process.argv[2]
const limitArg = process.argv.find((a) => a.startsWith('--limit='))
const phraseLimitArg = process.argv.find((a) => a.startsWith('--phrase-limit='))
const perWordArg = process.argv.find((a) => a.startsWith('--per-word='))

const LIMIT = limitArg ? Number(limitArg.split('=')[1]) : 50000
const PHRASE_LIMIT = phraseLimitArg ? Number(phraseLimitArg.split('=')[1]) : 30000
const PER_WORD = perWordArg ? Number(perWordArg.split('=')[1]) : 8

/** 反查时忽略的虚词（短语里几乎人人都有） */
const STOPWORDS = new Set(
  `
  a an the of to in on at for and or nor but so yet
  be am is are was were been being
  have has had having do does did doing
  will would can could may might shall should must
  with by from as into onto upon over under
  about after before between through during without within
  along across behind beyond above below up down out off
  it its this that these those
  i me my you your he him his she her we us our they them their
  not no nor none
  than then too very just also only own same such
  if when where why how what which who whom whose
  all each few more most other some any every
  again further once here there
  s t don ll ve re d m
  sb sth sb's one's
  `.trim().split(/\s+/),
)

/**
 * 学习向「固定搭配」信号词：小品词/介词。
 * 含这些词的短语（look after / take place / good at）优先于纯复合名词（comic book）。
 */
const COLLOCATION_MARKERS = new Set([
  'at', 'for', 'to', 'on', 'off', 'up', 'down', 'out', 'in', 'after', 'about',
  'over', 'into', 'with', 'from', 'by', 'of', 'against', 'around', 'through',
  'away', 'back', 'apart', 'along', 'across', 'under', 'upon', 'without',
  'ahead', 'aside', 'together', 'forward', 'aside',
])

/** 常见动词开头，更像可学搭配而非专名复合词 */
const COLLOCATION_VERB_START =
  /^(be|look|take|make|get|give|put|come|go|set|bring|keep|hold|turn|run|break|carry|call|fall|pay|play|work|do|have|let|lay|pass|pull|push|pick|send|show|stand|catch|cut|deal|fill|find|grow|hang|hit|leave|live|move|open|point|read|see|sit|speak|start|stick|throw|try|wait|walk|watch|wear|win|write|draw|bring|account|depend|consist|deal|refer|belong|listen|wait|agree|ask|think|talk|speak|feel|seem|appear|become|remain|happen|occur|take|make)\b/

if (!csvPath || !fs.existsSync(csvPath)) {
  console.error('请传入 ecdict.csv 路径，例如:')
  console.error('  node scripts/build-ecdict-core.mjs "D:/dictionary/ecdict.csv"')
  process.exit(1)
}

function parseCsvLine(line) {
  const fields = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cur += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      fields.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  fields.push(cur)
  return fields
}

/** 流式按「完整 CSV 行」读取（支持引号内换行） */
function* iterateCsvRecords(text) {
  let i = 0
  const n = text.length
  while (i < n) {
    let inQuotes = false
    const start = i
    for (; i < n; i++) {
      const ch = text[i]
      if (ch === '"') {
        if (inQuotes && text[i + 1] === '"') {
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
        break
      }
    }
    let end = i
    while (end > start && (text[end - 1] === '\r' || text[end - 1] === ' ')) end--
    const line = text.slice(start, end)
    while (i < n && (text[i] === '\n' || text[i] === '\r')) i++
    if (line.trim()) yield line
  }
}

function rankScore(row) {
  const collins = Number(row.collins) || 0
  const oxford = Number(row.oxford) || 0
  const bnc = Number(row.bnc) || 0
  const frq = Number(row.frq) || 0
  const tag = row.tag || ''

  const freqRank = [bnc, frq].filter((x) => x > 0)
  const bestRank = freqRank.length ? Math.min(...freqRank) : 999999
  const freqScore = bestRank >= 999999 ? 0 : Math.max(0, 1_000_000 - bestRank)

  let examBonus = 0
  if (/\bcet4\b/i.test(tag)) examBonus += 80_000
  if (/\bcet6\b/i.test(tag)) examBonus += 70_000
  if (/\bky\b/i.test(tag) || /考研/.test(tag)) examBonus += 75_000
  if (/\bielts\b/i.test(tag)) examBonus += 60_000
  if (/\btoefl\b/i.test(tag)) examBonus += 60_000
  if (/\bgk\b/i.test(tag) || /\bzk\b/i.test(tag)) examBonus += 50_000
  if (/\bgre\b/i.test(tag)) examBonus += 40_000

  return freqScore + examBonus + oxford * 200_000 + collins * 30_000
}

function isUsefulLemma(word) {
  if (!word) return false
  if (word.length > 40) return false
  if (/^[^a-zA-Z]/.test(word)) return false
  if (/\s/.test(word) && word.length > 24) return false
  return true
}

function isPhraseHeadword(word) {
  if (!word || !/\s/.test(word)) return false
  if (word.length < 4 || word.length > 60) return false
  if (/^[^a-zA-Z]/.test(word)) return false
  const tokens = tokenizePhrase(word)
  if (tokens.length < 2 || tokens.length > 6) return false
  // 圣经/目录式「book of xxx」噪声极大，直接丢掉
  if (/^book of\b/.test(word.toLowerCase())) return false
  // 至少有一个非虚词
  return tokens.some((t) => !STOPWORDS.has(t))
}

function tokenizePhrase(phrase) {
  return phrase
    .toLowerCase()
    .split(/[\s/\-–—]+/)
    .map((t) => t.replace(/[^a-z']/g, ''))
    .filter(Boolean)
}

function hasCollocationMarker(phraseOrTokens) {
  // 只按空格切词，避免 paper-back / pop-up 里的 back、up 被当成小品词
  const parts = Array.isArray(phraseOrTokens)
    ? phraseOrTokens
    : phraseOrTokens
        .toLowerCase()
        .split(/\s+/)
        .map((t) => t.replace(/[^a-z']/g, ''))
        .filter(Boolean)
  return parts.some((t) => COLLOCATION_MARKERS.has(t))
}

function phraseScore(row) {
  const tokens = tokenizePhrase(row.word)
  const spaceTokens = row.word
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z']/g, ''))
    .filter(Boolean)
  const contentCount = tokens.filter((t) => !STOPWORDS.has(t)).length
  const shortness = Math.max(0, 8 - tokens.length) * 8_000
  const contentBonus = contentCount * 4_000
  let score = rankScore(row) + shortness + contentBonus

  const marked = hasCollocationMarker(spaceTokens)
  // 含介词/小品词：更像固定搭配 / 短语动词
  if (marked) score += 220_000
  // 动词开头：take place / look after / be good at
  if (COLLOCATION_VERB_START.test(row.word)) score += 90_000
  // 纯双词复合名词（comic book / book bag）：大幅降权，但仍可垫底
  if (spaceTokens.length === 2 && !marked) score -= 180_000
  // 专业领域标注：[经][计][医]… 对考试搭配价值低
  if (/\[(经|计|医|化|物|生|法|军|航|海|电|机|工|农|数|气|矿)\]/.test(row.translation)) {
    score -= 120_000
  }
  // 释义以 n. 开头且无搭配标记：大概率是复合名词词条
  if (!marked && /^\s*n\./i.test(row.translation)) score -= 60_000

  return score
}

function firstTranslationLine(translation) {
  const normalized = (translation || '').replace(/\\n/g, '\n')
  const line = normalized
    .split(/\r?\n/)
    .map((s) => s.trim())
    .find(Boolean)
  if (!line) return ''
  return line.length > 80 ? `${line.slice(0, 77)}…` : line
}

console.log('读取 CSV…', csvPath)
const raw = fs.readFileSync(csvPath, 'utf8')
console.log('解析中…')

const lemmaRows = []
const phraseRows = []
let headerSkipped = false

for (const line of iterateCsvRecords(raw)) {
  if (!headerSkipped) {
    headerSkipped = true
    continue
  }
  const cols = parseCsvLine(line)
  if (cols.length < 10) continue

  const wordRaw = (cols[0] || '').trim()
  const phonetic = (cols[1] || '').trim()
  const translation = (cols[3] || '').trim()
  if (!translation) continue

  const pos = (cols[4] || '').trim()
  const collins = cols[5] || '0'
  const oxford = cols[6] || '0'
  const tag = (cols[7] || '').trim()
  const bnc = cols[8] || '0'
  const frq = cols[9] || '0'

  const base = {
    word: wordRaw.toLowerCase(),
    phonetic,
    translation,
    pos,
    tag,
    collins,
    oxford,
    bnc,
    frq,
  }

  if (isPhraseHeadword(wordRaw)) {
    phraseRows.push(base)
  } else if (isUsefulLemma(wordRaw) && !/\s/.test(wordRaw)) {
    lemmaRows.push(base)
  }
}

console.log(`单词词条: ${lemmaRows.length}，短语词条: ${phraseRows.length}`)

for (const r of lemmaRows) r.score = rankScore(r)
lemmaRows.sort((a, b) => b.score - a.score || a.word.localeCompare(b.word))

const seenLemma = new Set()
const pickedLemmas = []
for (const r of lemmaRows) {
  if (seenLemma.has(r.word)) continue
  seenLemma.add(r.word)
  pickedLemmas.push(r)
  if (pickedLemmas.length >= LIMIT) break
}

const coreWordSet = new Set(pickedLemmas.map((r) => r.word))

for (const r of phraseRows) r.score = phraseScore(r)
phraseRows.sort((a, b) => b.score - a.score || a.word.localeCompare(b.word))

const seenPhrase = new Set()
const pickedPhrases = []
for (const r of phraseRows) {
  if (seenPhrase.has(r.word)) continue
  // 短语至少命中一个核心词，才值得进反查包
  const tokens = tokenizePhrase(r.word)
  const hitsCore = tokens.some((t) => !STOPWORDS.has(t) && coreWordSet.has(t))
  if (!hitsCore) continue
  seenPhrase.add(r.word)
  pickedPhrases.push({
    phrase: r.word,
    translation: firstTranslationLine(r.translation),
    score: r.score,
    tokens,
  })
  if (pickedPhrases.length >= PHRASE_LIMIT) break
}

/** word -> [{phrase, translation, score}] */
const indexMap = new Map()
for (const item of pickedPhrases) {
  const contentTokens = [...new Set(item.tokens.filter((t) => !STOPWORDS.has(t) && coreWordSet.has(t)))]
  for (const token of contentTokens) {
    let list = indexMap.get(token)
    if (!list) {
      list = []
      indexMap.set(token, list)
    }
    list.push({
      phrase: item.phrase,
      translation: item.translation,
      score: item.score,
    })
  }
}

const indexEntries = []
for (const [word, list] of indexMap) {
  list.sort((a, b) => b.score - a.score || a.phrase.length - b.phrase.length || a.phrase.localeCompare(b.phrase))
  const trimmed = []
  const seen = new Set()
  let markedCount = 0
  for (const p of list) {
    if (seen.has(p.phrase)) continue
    const marked = hasCollocationMarker(p.phrase)
    // 已有足够固定搭配时，不再用纯复合名词凑数
    if (!marked && markedCount >= 4) continue
    seen.add(p.phrase)
    if (marked) markedCount++
    trimmed.push([p.phrase, p.translation])
    if (trimmed.length >= PER_WORD) break
  }
  if (trimmed.length) {
    indexEntries.push([word, trimmed])
  }
}

indexEntries.sort((a, b) => a[0].localeCompare(b[0]))

/** 形近词：编辑距离（adapt/adopt/adept），写入独立包 */
function editDistance(a, b, maxDist = 2) {
  if (a === b) return 0
  const la = a.length
  const lb = b.length
  if (Math.abs(la - lb) > maxDist) return maxDist + 1
  let prev = Array.from({ length: lb + 1 }, (_, j) => j)
  let curr = new Array(lb + 1)
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

function hasCommonTrigram(a, b) {
  if (a.length < 3 || b.length < 3) return false
  const set = new Set()
  for (let i = 0; i <= a.length - 3; i++) set.add(a.slice(i, i + 3))
  for (let i = 0; i <= b.length - 3; i++) {
    if (set.has(b.slice(i, i + 3))) return true
  }
  return false
}

function isLookalike(a, b) {
  if (!a || !b || a === b) return false
  if (Math.abs(a.length - b.length) > 2) return false
  const maxLen = Math.max(a.length, b.length)
  if (maxLen <= 5) return editDistance(a, b, 1) <= 1
  const dist = editDistance(a, b, 2)
  if (dist > 2) return false
  if (dist <= 1) return true
  if (a[0] === b[0] && a.length === b.length) return true
  return hasCommonTrigram(a, b)
}

console.log('构建形近词索引…')
const byFirst = new Map()
for (const r of pickedLemmas) {
  const ch = r.word[0] || ''
  let list = byFirst.get(ch)
  if (!list) {
    list = []
    byFirst.set(ch, list)
  }
  list.push(r)
}

const LOOKALIKE_PER = 6
const lookalikeEntries = []
for (const r of pickedLemmas) {
  const pool = byFirst.get(r.word[0] || '') || []
  const hits = []
  for (const o of pool) {
    if (o.word === r.word) continue
    if (Math.abs(o.word.length - r.word.length) > 2) continue
    if (!isLookalike(r.word, o.word)) continue
    const dist = editDistance(r.word, o.word, 2)
    hits.push({
      word: o.word,
      translation: firstTranslationLine(o.translation),
      pos: o.pos || '',
      dist,
    })
  }
  hits.sort((a, b) => a.dist - b.dist || a.word.localeCompare(b.word))
  const trimmed = []
  const seen = new Set()
  for (const h of hits) {
    if (seen.has(h.word)) continue
    seen.add(h.word)
    trimmed.push([h.word, h.translation, h.pos])
    if (trimmed.length >= LOOKALIKE_PER) break
  }
  if (trimmed.length) lookalikeEntries.push([r.word, trimmed])
}

const lookalikePayload = {
  v: 1,
  source: 'ECDICT',
  license: 'MIT',
  generatedAt: new Date().toISOString(),
  wordCount: lookalikeEntries.length,
  perWord: LOOKALIKE_PER,
  // [word, [[neighbor, translation, pos], ...]]
  index: lookalikeEntries,
}

const corePayload = {
  v: 2,
  source: 'ECDICT',
  license: 'MIT',
  generatedAt: new Date().toISOString(),
  count: pickedLemmas.length,
  // 紧凑数组： [word, phonetic, translation, pos, tag]
  entries: pickedLemmas.map((r) => [r.word, r.phonetic, r.translation, r.pos, r.tag]),
}

const phrasePayload = {
  v: 2,
  source: 'ECDICT',
  license: 'MIT',
  generatedAt: new Date().toISOString(),
  phraseCount: pickedPhrases.length,
  wordCount: indexEntries.length,
  perWord: PER_WORD,
  // 紧凑： [word, [[phrase, translation], ...]]
  index: indexEntries,
}

const outLookalikePath = path.join(root, 'public', 'dict', 'ecdict-lookalikes.json')

fs.mkdirSync(path.dirname(outCorePath), { recursive: true })
fs.writeFileSync(outCorePath, JSON.stringify(corePayload), 'utf8')
fs.writeFileSync(outPhrasePath, JSON.stringify(phrasePayload), 'utf8')
fs.writeFileSync(outLookalikePath, JSON.stringify(lookalikePayload), 'utf8')

const coreMb = (fs.statSync(outCorePath).size / 1024 / 1024).toFixed(2)
const phraseMb = (fs.statSync(outPhrasePath).size / 1024 / 1024).toFixed(2)
const lookMb = (fs.statSync(outLookalikePath).size / 1024 / 1024).toFixed(2)
console.log(`已写入 ${outCorePath}`)
console.log(`  词条 ${pickedLemmas.length}，约 ${coreMb} MB`)
console.log(`已写入 ${outPhrasePath}`)
console.log(`  短语 ${pickedPhrases.length}，反查词 ${indexEntries.length}，约 ${phraseMb} MB`)
console.log(`已写入 ${outLookalikePath}`)
console.log(`  形近索引词 ${lookalikeEntries.length}，约 ${lookMb} MB`)
console.log('核心词示例:', pickedLemmas.slice(0, 5).map((r) => r.word).join(', '))
const sampleWord = indexEntries.find((e) => e[1].length >= 2)?.[0] || indexEntries[0]?.[0]
if (sampleWord) {
  const sample = indexEntries.find((e) => e[0] === sampleWord)
  console.log(`短语示例 (${sampleWord}):`, sample[1].slice(0, 3).map((p) => p[0]).join(' | '))
}
const adaptHit = lookalikeEntries.find((e) => e[0] === 'adapt')
if (adaptHit) {
  console.log('形近示例 (adapt):', adaptHit[1].map((x) => x[0]).join(' | '))
}
