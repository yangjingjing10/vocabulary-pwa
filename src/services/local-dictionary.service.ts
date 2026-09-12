import type { LocalDictEntry } from '@/db/schema/database'
import {
  bulkPutLocalDict,
  getLocalDictEntry,
  getLocalDictMeta,
} from '@/db/repositories/local-dict.repository'

/** 与 public/dict/ecdict-core.json 的 v 字段对齐；升级精简包时递增 */
export const LOCAL_DICT_PACK_VERSION = 1
export const LOCAL_DICT_URL = '/dict/ecdict-core.json'

type PackPayload = {
  v: number
  source?: string
  count: number
  entries: [string, string, string, string, string][]
}

let ensurePromise: Promise<boolean> | null = null

function normalizeWord(word: string): string {
  return word.toLowerCase().trim().replace(/[.,!?;:"'()[\]{}]/g, '')
}

/** 首次打开时从静态资源导入精简词库到 IndexedDB（每台设备各导入一次） */
export async function ensureLocalDictionary(
  onProgress?: (done: number, total: number) => void,
): Promise<boolean> {
  if (!ensurePromise) {
    ensurePromise = doEnsure(onProgress).then(
      (ok) => {
        if (!ok) ensurePromise = null
        return ok
      },
      (err) => {
        ensurePromise = null
        throw err
      },
    )
  }
  return ensurePromise
}

async function doEnsure(onProgress?: (done: number, total: number) => void): Promise<boolean> {
  const meta = await getLocalDictMeta()
  if (meta && meta.version >= LOCAL_DICT_PACK_VERSION && meta.count > 0) {
    return true
  }

  const response = await fetch(LOCAL_DICT_URL)
  if (!response.ok) {
    console.error('[local-dict] failed to fetch pack:', response.status)
    return false
  }

  const pack = (await response.json()) as PackPayload
  if (!pack?.entries?.length) {
    console.error('[local-dict] empty pack')
    return false
  }

  const entries: LocalDictEntry[] = pack.entries.map(([word, phonetic, translation, pos, tag]) => ({
    word,
    phonetic: phonetic || '',
    translation: translation || '',
    pos: pos || '',
    tag: tag || '',
  }))

  await bulkPutLocalDict(
    entries,
    {
      version: pack.v || LOCAL_DICT_PACK_VERSION,
      count: entries.length,
      importedAt: Date.now(),
      source: pack.source || 'ECDICT',
    },
    onProgress,
  )

  console.log(`[local-dict] imported ${entries.length} entries`)
  return true
}

export async function lookupLocalDictionary(word: string): Promise<LocalDictEntry | null> {
  const key = normalizeWord(word)
  if (!key) return null

  const exact = await getLocalDictEntry(key)
  if (exact) return exact

  // 简单去词尾：books -> book, studies -> study（覆盖常见阅读变形）
  const candidates = stemCandidates(key)
  for (const c of candidates) {
    const hit = await getLocalDictEntry(c)
    if (hit) return hit
  }
  return null
}

function stemCandidates(word: string): string[] {
  const out: string[] = []
  if (word.endsWith('ies') && word.length > 4) out.push(word.slice(0, -3) + 'y')
  if (word.endsWith('es') && word.length > 3) out.push(word.slice(0, -2))
  if (word.endsWith('s') && word.length > 2) out.push(word.slice(0, -1))
  if (word.endsWith('ing') && word.length > 5) {
    out.push(word.slice(0, -3))
    out.push(word.slice(0, -3) + 'e')
  }
  if (word.endsWith('ed') && word.length > 3) {
    out.push(word.slice(0, -2))
    out.push(word.slice(0, -1))
  }
  return [...new Set(out)]
}
