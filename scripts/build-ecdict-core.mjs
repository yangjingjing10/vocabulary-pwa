/**
 * 从 ECDICT CSV 生成精简词库 JSON，供 App 首次下载写入 IndexedDB。
 *
 * 用法:
 *   node scripts/build-ecdict-core.mjs "D:/dictionary/ecdict .csv"
 *   node scripts/build-ecdict-core.mjs "D:/dictionary/ecdict .csv" --limit=50000
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const outPath = path.join(root, 'public', 'dict', 'ecdict-core.json')

const csvPath = process.argv[2]
const limitArg = process.argv.find((a) => a.startsWith('--limit='))
const LIMIT = limitArg ? Number(limitArg.split('=')[1]) : 50000

if (!csvPath || !fs.existsSync(csvPath)) {
  console.error('请传入 ecdict.csv 路径，例如:')
  console.error('  node scripts/build-ecdict-core.mjs "D:/dictionary/ecdict .csv"')
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

  // 频率：有语料排名时，越小越好；映射成 0~1 的「常用度」
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
  // 跳过明显专名/残缺条；保留常见带撇号词如 don't
  if (/^[^a-zA-Z]/.test(word)) return false
  if (/\s/.test(word) && word.length > 24) return false
  return true
}

console.log('读取 CSV…', csvPath)
const raw = fs.readFileSync(csvPath, 'utf8')
console.log('解析中…')

const rows = []
let headerSkipped = false
for (const line of iterateCsvRecords(raw)) {
  if (!headerSkipped) {
    headerSkipped = true
    continue
  }
  const cols = parseCsvLine(line)
  if (cols.length < 10) continue

  const word = (cols[0] || '').trim()
  if (!isUsefulLemma(word)) continue

  const phonetic = (cols[1] || '').trim()
  const translation = (cols[3] || '').trim()
  if (!translation) continue

  const pos = (cols[4] || '').trim()
  const collins = cols[5] || '0'
  const oxford = cols[6] || '0'
  const tag = (cols[7] || '').trim()
  const bnc = cols[8] || '0'
  const frq = cols[9] || '0'

  rows.push({
    word: word.toLowerCase(),
    phonetic,
    translation,
    pos,
    tag,
    collins,
    oxford,
    bnc,
    frq,
    score: 0,
  })
}

console.log(`有效词条: ${rows.length}`)
for (const r of rows) r.score = rankScore(r)
rows.sort((a, b) => b.score - a.score || a.word.localeCompare(b.word))

// 同词去重，保留分数更高者
const seen = new Set()
const picked = []
for (const r of rows) {
  if (seen.has(r.word)) continue
  seen.add(r.word)
  picked.push(r)
  if (picked.length >= LIMIT) break
}

const payload = {
  v: 1,
  source: 'ECDICT',
  license: 'MIT',
  generatedAt: new Date().toISOString(),
  count: picked.length,
  // 紧凑数组： [word, phonetic, translation, pos, tag]
  entries: picked.map((r) => [r.word, r.phonetic, r.translation, r.pos, r.tag]),
}

fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(payload), 'utf8')
const mb = (fs.statSync(outPath).size / 1024 / 1024).toFixed(2)
console.log(`已写入 ${outPath}`)
console.log(`词条 ${picked.length}，文件约 ${mb} MB`)
console.log('示例:', picked.slice(0, 5).map((r) => r.word).join(', '))
