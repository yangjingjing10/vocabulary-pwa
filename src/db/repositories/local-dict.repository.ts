import { initDatabase } from '../index'
import type {
  LocalDictEntry,
  LocalDictMeta,
  LocalExampleIndexEntry,
  LocalExampleItem,
  LocalLookalikeIndexEntry,
  LocalLookalikeItem,
  LocalPhraseIndexEntry,
  LocalPhraseItem,
} from '../schema/database'

const META_ID = 'core' as const
const BATCH_SIZE = 500

export async function getLocalDictMeta(): Promise<LocalDictMeta | undefined> {
  const db = await initDatabase()
  return db.get('localDictMeta', META_ID)
}

export async function getLocalDictEntry(word: string): Promise<LocalDictEntry | undefined> {
  const db = await initDatabase()
  return db.get('localDict', word.toLowerCase().trim())
}

export async function getLocalPhrasesForWord(word: string): Promise<LocalPhraseItem[]> {
  const db = await initDatabase()
  const entry = await db.get('localPhraseIndex', word.toLowerCase().trim())
  return entry?.phrases ?? []
}

export async function getLocalLookalikesForWord(word: string): Promise<LocalLookalikeItem[]> {
  const db = await initDatabase()
  if (!db.objectStoreNames.contains('localLookalikeIndex')) return []
  const entry = await db.get('localLookalikeIndex', word.toLowerCase().trim())
  return entry?.items ?? []
}

export async function getLocalExamplesForWord(word: string): Promise<LocalExampleItem[]> {
  const db = await initDatabase()
  const key = word.toLowerCase().trim()
  if (!key) return []

  const pack = db.objectStoreNames.contains('localExampleIndex')
    ? ((await db.get('localExampleIndex', key))?.examples ?? [])
    : []
  const custom = await getUserExamplesForWord(key)

  if (!custom.length) return pack
  if (!pack.length) return custom

  const seen = new Set<string>()
  const merged: LocalExampleItem[] = []
  for (const item of [...custom, ...pack]) {
    const sentenceKey = item.sentence.toLowerCase().trim()
    if (!sentenceKey || seen.has(sentenceKey)) continue
    seen.add(sentenceKey)
    merged.push(item)
  }
  return merged
}

/** 仅读取用户/AI 例句表 */
export async function getUserExamplesForWord(word: string): Promise<LocalExampleItem[]> {
  const db = await initDatabase()
  const key = word.toLowerCase().trim()
  if (!key || !db.objectStoreNames.contains('userExampleIndex')) return []
  return (await db.get('userExampleIndex', key))?.examples ?? []
}

/** 写入用户/AI 例句（独立于 Tatoeba 词包，可备份） */
export async function putLocalExamplesForWord(
  word: string,
  examples: LocalExampleItem[],
): Promise<void> {
  const db = await initDatabase()
  if (!db.objectStoreNames.contains('userExampleIndex')) return
  const key = word.toLowerCase().trim()
  if (!key) return
  const entry: LocalExampleIndexEntry = {
    word: key,
    examples: examples.map((e) => ({
      sentence: e.sentence.trim(),
      translation: (e.translation || '').trim(),
    })),
  }
  await db.put('userExampleIndex', entry)
}

export async function clearLocalDict(): Promise<void> {
  const db = await initDatabase()
  const storeNames = [
    'localDict',
    'localDictMeta',
    'localPhraseIndex',
    'localLookalikeIndex',
    'localExampleIndex',
    'userExampleIndex',
  ] as const
  const existing = storeNames.filter((name) => db.objectStoreNames.contains(name))
  const tx = db.transaction(existing, 'readwrite')
  await Promise.all([...existing.map((name) => tx.objectStore(name).clear()), tx.done])
}

/** 批量写入词条并更新 meta；entries 很大时分批，避免卡住 UI */
export async function bulkPutLocalDict(
  entries: LocalDictEntry[],
  meta: Omit<LocalDictMeta, 'id'>,
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  const db = await initDatabase()
  const total = entries.length

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const chunk = entries.slice(i, i + BATCH_SIZE)
    const tx = db.transaction('localDict', 'readwrite')
    const store = tx.objectStore('localDict')
    await Promise.all([...chunk.map((e) => store.put(e)), tx.done])
    onProgress?.(Math.min(i + chunk.length, total), total)
  }

  await db.put('localDictMeta', { id: META_ID, ...meta })
}

/** 批量写入短语反查索引，并合并更新 meta 中的短语字段 */
export async function bulkPutLocalPhraseIndex(
  entries: LocalPhraseIndexEntry[],
  phraseMeta: Pick<LocalDictMeta, 'phraseVersion' | 'phraseWordCount'>,
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  const db = await initDatabase()

  if (db.objectStoreNames.contains('localPhraseIndex')) {
    const clearTx = db.transaction('localPhraseIndex', 'readwrite')
    await Promise.all([clearTx.objectStore('localPhraseIndex').clear(), clearTx.done])

    const total = entries.length
    for (let i = 0; i < total; i += BATCH_SIZE) {
      const chunk = entries.slice(i, i + BATCH_SIZE)
      const tx = db.transaction('localPhraseIndex', 'readwrite')
      const store = tx.objectStore('localPhraseIndex')
      await Promise.all([...chunk.map((e) => store.put(e)), tx.done])
      onProgress?.(Math.min(i + chunk.length, total), total)
    }
  }

  const prev = (await db.get('localDictMeta', META_ID)) || {
    id: META_ID,
    version: 0,
    count: 0,
    importedAt: Date.now(),
    source: 'ECDICT',
  }
  await db.put('localDictMeta', {
    ...prev,
    phraseVersion: phraseMeta.phraseVersion ?? 0,
    phraseWordCount: phraseMeta.phraseWordCount ?? entries.length,
  })
}

export async function bulkPutLocalLookalikeIndex(
  entries: LocalLookalikeIndexEntry[],
  lookalikeMeta: Pick<LocalDictMeta, 'lookalikeVersion' | 'lookalikeWordCount'>,
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  const db = await initDatabase()

  if (db.objectStoreNames.contains('localLookalikeIndex')) {
    const clearTx = db.transaction('localLookalikeIndex', 'readwrite')
    await Promise.all([clearTx.objectStore('localLookalikeIndex').clear(), clearTx.done])

    const total = entries.length
    for (let i = 0; i < total; i += BATCH_SIZE) {
      const chunk = entries.slice(i, i + BATCH_SIZE)
      const tx = db.transaction('localLookalikeIndex', 'readwrite')
      const store = tx.objectStore('localLookalikeIndex')
      await Promise.all([...chunk.map((e) => store.put(e)), tx.done])
      onProgress?.(Math.min(i + chunk.length, total), total)
    }
  }

  const prev = (await db.get('localDictMeta', META_ID)) || {
    id: META_ID,
    version: 0,
    count: 0,
    importedAt: Date.now(),
    source: 'ECDICT',
  }
  await db.put('localDictMeta', {
    ...prev,
    lookalikeVersion: lookalikeMeta.lookalikeVersion ?? 0,
    lookalikeWordCount: lookalikeMeta.lookalikeWordCount ?? entries.length,
  })
}

export async function bulkPutLocalExampleIndex(
  entries: LocalExampleIndexEntry[],
  exampleMeta: Pick<LocalDictMeta, 'exampleVersion' | 'exampleWordCount'>,
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  const db = await initDatabase()

  if (db.objectStoreNames.contains('localExampleIndex')) {
    // 重建词包前先保留已有例句（含 AI 生成），避免被清空
    const previous = await db.getAll('localExampleIndex')
    const prevByWord = new Map(
      previous.map((entry) => [entry.word.toLowerCase().trim(), entry.examples || []]),
    )

    const clearTx = db.transaction('localExampleIndex', 'readwrite')
    await Promise.all([clearTx.objectStore('localExampleIndex').clear(), clearTx.done])

    const total = entries.length
    for (let i = 0; i < total; i += BATCH_SIZE) {
      const chunk = entries.slice(i, i + BATCH_SIZE)
      const tx = db.transaction('localExampleIndex', 'readwrite')
      const store = tx.objectStore('localExampleIndex')
      await Promise.all([...chunk.map((e) => store.put(e)), tx.done])
      onProgress?.(Math.min(i + chunk.length, total), total)
    }

    // 把词包里没有的旧例句（多为 AI 生成）合并回去
    const mergeTx = db.transaction('localExampleIndex', 'readwrite')
    const mergeStore = mergeTx.objectStore('localExampleIndex')
    const touched = new Set<string>()

    for (const entry of entries) {
      const key = entry.word.toLowerCase().trim()
      touched.add(key)
      const oldExamples = prevByWord.get(key)
      if (!oldExamples?.length) continue

      const packKeys = new Set(
        (entry.examples || []).map((e) => e.sentence.toLowerCase().trim()),
      )
      const extras = oldExamples.filter(
        (e) => e.sentence?.trim() && !packKeys.has(e.sentence.toLowerCase().trim()),
      )
      if (!extras.length) continue

      const merged = [...extras, ...(entry.examples || [])].slice(0, 8)
      await mergeStore.put({ word: key, examples: merged })
    }

    // 仅有 AI 例句、词包未覆盖的词也要保留
    for (const [key, oldExamples] of prevByWord) {
      if (touched.has(key) || !oldExamples.length) continue
      await mergeStore.put({
        word: key,
        examples: oldExamples.slice(0, 8),
      })
    }

    await mergeTx.done
  }

  const prev = (await db.get('localDictMeta', META_ID)) || {
    id: META_ID,
    version: 0,
    count: 0,
    importedAt: Date.now(),
    source: 'ECDICT',
  }
  await db.put('localDictMeta', {
    ...prev,
    exampleVersion: exampleMeta.exampleVersion ?? 0,
    exampleWordCount: exampleMeta.exampleWordCount ?? entries.length,
  })
}

export async function countLocalDict(): Promise<number> {
  const db = await initDatabase()
  return db.count('localDict')
}
