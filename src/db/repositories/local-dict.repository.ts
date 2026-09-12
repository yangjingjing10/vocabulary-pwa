import { initDatabase } from '../index'
import type { LocalDictEntry, LocalDictMeta } from '../schema/database'

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

export async function clearLocalDict(): Promise<void> {
  const db = await initDatabase()
  const tx = db.transaction(['localDict', 'localDictMeta'], 'readwrite')
  await Promise.all([
    tx.objectStore('localDict').clear(),
    tx.objectStore('localDictMeta').clear(),
    tx.done,
  ])
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

export async function countLocalDict(): Promise<number> {
  const db = await initDatabase()
  return db.count('localDict')
}
