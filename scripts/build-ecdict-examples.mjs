/**
 * 从 Tatoeba 官方 dump 生成例句包 public/dict/ecdict-examples.json
 * （仅挂到 ecdict-core 核心词；每词限几条；优先带中文译文，无中文也收录）
 *
 * 许可：Tatoeba sentences/links → CC BY 2.0 FR
 *
 * 用法:
 *   node scripts/build-ecdict-examples.mjs \
 *     --sentences="D:/dictionary/sentences/sentences.csv" \
 *     --links="D:/dictionary/links.csv"
 *
 *   node scripts/build-ecdict-examples.mjs \
 *     --sentences=... --links=... --core=public/dict/ecdict-core.json --per-word=4
 */
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const outPath = path.join(root, 'public', 'dict', 'ecdict-examples.json')

function argValue(name, fallback = '') {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : fallback
}

const sentencesPath = argValue('sentences')
const linksPath = argValue('links')
const corePath = path.resolve(
  root,
  argValue('core', path.join('public', 'dict', 'ecdict-core.json')),
)
const PER_WORD = Number(argValue('per-word', '4')) || 4
const MIN_LEN = Number(argValue('min-len', '18')) || 18
const MAX_LEN = Number(argValue('max-len', '120')) || 120

if (!sentencesPath || !fs.existsSync(sentencesPath)) {
  console.error('请传入 --sentences=Tatoeba sentences.csv 路径')
  process.exit(1)
}
if (!linksPath || !fs.existsSync(linksPath)) {
  console.error('请传入 --links=Tatoeba links.csv 路径')
  process.exit(1)
}
if (!fs.existsSync(corePath)) {
  console.error('找不到核心词包:', corePath)
  process.exit(1)
}

/** 反查索引时跳过的超高频虚词（避免无意义灌满） */
const INDEX_STOPWORDS = new Set(
  `
  a an the of to in on at for and or nor but so yet
  be am is are was were been being
  have has had having do does did doing
  will would can could may might shall should must
  with by from as into onto upon over under
  about after before between through during without within
  it its this that these those
  i me my you your he him his she her we us our they them their
  not no than then too very just also only own same such
  if when where why how what which who whom whose
  all each few more most other some any every
  again further once here there
  s t don ll ve re d m
  `.trim().split(/\s+/),
)

function lemmaCandidates(token) {
  const t = token.toLowerCase()
  if (!t || t.length < 2) return []
  const out = [t]
  if (t.endsWith('ies') && t.length > 4) out.push(`${t.slice(0, -3)}y`)
  if (t.endsWith('es') && t.length > 3) out.push(t.slice(0, -2))
  if (t.endsWith('s') && t.length > 2) out.push(t.slice(0, -1))
  if (t.endsWith('ing') && t.length > 5) {
    out.push(t.slice(0, -3))
    out.push(`${t.slice(0, -3)}e`)
  }
  if (t.endsWith('ed') && t.length > 3) {
    out.push(t.slice(0, -2))
    out.push(t.slice(0, -1))
  }
  return [...new Set(out)]
}

function tokenize(sentence) {
  return sentence.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) || []
}

function scoreExample(sentence, hasTranslation, exactForm) {
  let score = 0
  if (hasTranslation) score += 100
  if (exactForm) score += 20
  const len = sentence.length
  // 学习向：中等长度更好
  if (len >= 25 && len <= 90) score += 15
  else if (len < 25) score += 5
  const words = tokenize(sentence).length
  if (words >= 4 && words <= 14) score += 10
  // 轻微偏好不含专名过多的句子（全大写词少）
  const caps = (sentence.match(/\b[A-Z][a-z]+\b/g) || []).length
  if (caps <= 2) score += 3
  return score
}

async function forEachLine(filePath, onLine) {
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  })
  let n = 0
  for await (const line of rl) {
    n += 1
    onLine(line, n)
  }
  return n
}

console.log('读取核心词…', corePath)
const corePack = JSON.parse(fs.readFileSync(corePath, 'utf8'))
const coreWords = new Set()
for (const row of corePack.entries || []) {
  const w = String(row[0] || '')
    .toLowerCase()
    .trim()
  if (w && !INDEX_STOPWORDS.has(w) && !/\s/.test(w)) coreWords.add(w)
}
console.log(`核心可挂例句词：${coreWords.size}`)

/** @type {Map<number, string>} */
const engById = new Map()
/** @type {Map<number, string>} */
const cmnById = new Map()

console.log('扫描 sentences.csv（eng / cmn）…')
let engKept = 0
let cmnKept = 0
await forEachLine(sentencesPath, (line, n) => {
  if (n % 2_000_000 === 0) console.log(`  sentences 行 ${n}…`)
  if (!line) return
  const tab1 = line.indexOf('\t')
  if (tab1 < 0) return
  const tab2 = line.indexOf('\t', tab1 + 1)
  if (tab2 < 0) return
  const id = Number(line.slice(0, tab1))
  const lang = line.slice(tab1 + 1, tab2)
  const text = line.slice(tab2 + 1).trim()
  if (!id || !text) return

  if (lang === 'eng') {
    if (text.length < MIN_LEN || text.length > MAX_LEN) return
    // 排除明显非例句噪声
    if (/https?:\/\//i.test(text)) return
    if ((text.match(/[a-zA-Z]/g) || []).length < 8) return
    engById.set(id, text)
    engKept += 1
  } else if (lang === 'cmn') {
    // 允许繁简；过滤过短
    if (text.length < 2 || text.length > 80) return
    cmnById.set(id, text)
    cmnKept += 1
  }
})
console.log(`  保留英句 ${engKept}，中句 ${cmnKept}`)

/** engId → 首选中文译文 */
const engToCmn = new Map()
console.log('扫描 links.csv（eng↔cmn）…')
await forEachLine(linksPath, (line, n) => {
  if (n % 5_000_000 === 0) console.log(`  links 行 ${n}…`)
  if (!line) return
  const tab = line.indexOf('\t')
  if (tab < 0) return
  const a = Number(line.slice(0, tab))
  const b = Number(line.slice(tab + 1))
  if (!a || !b) return

  if (engById.has(a) && cmnById.has(b)) {
    if (!engToCmn.has(a)) engToCmn.set(a, cmnById.get(b))
  } else if (engById.has(b) && cmnById.has(a)) {
    if (!engToCmn.has(b)) engToCmn.set(b, cmnById.get(a))
  }
})
console.log(`  有中文配对的英句：${engToCmn.size}`)

// 释放中文全文，只留配对结果
cmnById.clear()

/** word → [{ sentence, translation, score, sid }] */
const buckets = new Map()
let indexedSentences = 0

console.log('按词倒排…')
for (const [sid, sentence] of engById) {
  indexedSentences += 1
  if (indexedSentences % 500_000 === 0) {
    console.log(`  已处理英句 ${indexedSentences}…`)
  }
  const translation = engToCmn.get(sid) || ''
  const hasTr = !!translation
  const tokens = tokenize(sentence)
  if (tokens.length < 3) continue

  /** @type {Map<string, boolean>} lemma → exactForm */
  const hitLemmas = new Map()
  for (const token of tokens) {
    if (INDEX_STOPWORDS.has(token)) continue
    for (const cand of lemmaCandidates(token)) {
      if (!coreWords.has(cand)) continue
      const exact = token === cand
      if (!hitLemmas.has(cand) || exact) hitLemmas.set(cand, exact)
    }
  }
  if (!hitLemmas.size) continue

  for (const [lemma, exactForm] of hitLemmas) {
    const score = scoreExample(sentence, hasTr, exactForm)
    let list = buckets.get(lemma)
    if (!list) {
      list = []
      buckets.set(lemma, list)
    }
    // 同一词下句子去重（忽略大小写）
    const key = sentence.toLowerCase()
    if (list.some((x) => x.key === key)) continue
    list.push({ sentence, translation, score, key })
    // 控制内存：超额时裁到较好的若干条
    if (list.length > PER_WORD * 4) {
      list.sort((a, b) => b.score - a.score || a.sentence.length - b.sentence.length)
      list.length = PER_WORD * 3
    }
  }
}

console.log(`有例句的词：${buckets.size}`)

const index = []
let exampleCount = 0
let withTranslation = 0
for (const word of [...buckets.keys()].sort()) {
  const list = buckets.get(word)
  list.sort((a, b) => b.score - a.score || a.sentence.length - b.sentence.length)
  const trimmed = []
  const seen = new Set()
  for (const item of list) {
    if (seen.has(item.key)) continue
    seen.add(item.key)
    trimmed.push([item.sentence, item.translation || ''])
    if (item.translation) withTranslation += 1
    if (trimmed.length >= PER_WORD) break
  }
  if (!trimmed.length) continue
  exampleCount += trimmed.length
  index.push([word, trimmed])
}

const payload = {
  v: 1,
  source: 'Tatoeba',
  license: 'CC BY 2.0 FR',
  attribution: 'Examples from tatoeba.org (CC BY 2.0 FR)',
  generatedAt: new Date().toISOString(),
  wordCount: index.length,
  exampleCount,
  withTranslation,
  perWord: PER_WORD,
  coreSource: path.relative(root, corePath).replace(/\\/g, '/'),
  // 紧凑：[word, [[sentence, translation], ...]]
  index,
}

fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(payload), 'utf8')
const mb = (fs.statSync(outPath).size / 1024 / 1024).toFixed(2)
console.log(`已写入 ${outPath}`)
console.log(`  词 ${index.length}，例句 ${exampleCount}（含中文 ${withTranslation}），约 ${mb} MB`)

const sample =
  index.find((e) => e[0] === 'adapt') ||
  index.find((e) => e[1].some((x) => x[1])) ||
  index[0]
if (sample) {
  console.log(`示例 (${sample[0]}):`)
  for (const [s, tr] of sample[1].slice(0, 2)) {
    console.log(`  - ${s}`)
    if (tr) console.log(`    ${tr}`)
  }
}
