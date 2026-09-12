import { initDatabase } from '../index'
import type { ChoiceQuizRecord } from '../schema/database'

export async function saveChoiceQuizRecord(
  record: Omit<ChoiceQuizRecord, 'id' | 'createdAt'>,
): Promise<string> {
  const db = await initDatabase()
  const id = `choice-quiz-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const fullRecord: ChoiceQuizRecord = {
    ...record,
    id,
    createdAt: Date.now(),
  }
  await db.add('choiceQuizRecords', fullRecord)
  return id
}

export async function getChoiceQuizRecordsByDate(date: string): Promise<ChoiceQuizRecord[]> {
  const db = await initDatabase()
  const records = await db.getAllFromIndex('choiceQuizRecords', 'by-date', date)
  return records.sort((a, b) => b.createdAt - a.createdAt)
}

export async function getChoiceQuizRecord(id: string): Promise<ChoiceQuizRecord | undefined> {
  const db = await initDatabase()
  return db.get('choiceQuizRecords', id)
}

export async function deleteChoiceQuizRecord(id: string): Promise<void> {
  const db = await initDatabase()
  await db.delete('choiceQuizRecords', id)
}

export async function clearChoiceQuizRecords(): Promise<void> {
  const db = await initDatabase()
  await db.clear('choiceQuizRecords')
}
