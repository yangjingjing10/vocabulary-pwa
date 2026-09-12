import { initDatabase } from '../index'
import type { VocabularyWord } from '../schema/database'

export async function addWord(word: VocabularyWord) {
  const db = await initDatabase()
  await db.add('words', word)
}

export async function getWordsByDate(date: string): Promise<VocabularyWord[]> {
  const db = await initDatabase()
  return db.getAllFromIndex('words', 'by-date', date)
}

export async function getWordsByDateRange(startDate: string, endDate: string): Promise<VocabularyWord[]> {
  const db = await initDatabase()
  const allWords = await db.getAll('words')
  return allWords.filter(w => w.date >= startDate && w.date <= endDate)
    .sort((a, b) => b.addedAt - a.addedAt)
}

export async function getAllWords(): Promise<VocabularyWord[]> {
  const db = await initDatabase()
  const words = await db.getAll('words')
  return words.sort((a, b) => b.addedAt - a.addedAt)
}

export async function deleteWord(id: string) {
  const db = await initDatabase()
  await db.delete('words', id)
}
