import { initDatabase } from '../index'
import type { TranslationRecord } from '../schema/database'

export async function saveTranslationRecord(record: Omit<TranslationRecord, 'id' | 'createdAt'>): Promise<string> {
  const db = await initDatabase()
  const id = `translation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  const fullRecord: TranslationRecord = {
    ...record,
    id,
    createdAt: Date.now()
  }
  await db.add('translationRecords', fullRecord)
  return id
}

export async function getTranslationRecordsByDate(date: string): Promise<TranslationRecord[]> {
  const db = await initDatabase()
  return db.getAllFromIndex('translationRecords', 'by-date', date)
}

export async function getAllTranslationRecords(): Promise<TranslationRecord[]> {
  const db = await initDatabase()
  const records = await db.getAll('translationRecords')
  return records.sort((a, b) => b.createdAt - a.createdAt)
}

export async function deleteTranslationRecord(id: string): Promise<void> {
  const db = await initDatabase()
  await db.delete('translationRecords', id)
}

export async function getTranslationRecord(id: string): Promise<TranslationRecord | undefined> {
  const db = await initDatabase()
  return db.get('translationRecords', id)
}
