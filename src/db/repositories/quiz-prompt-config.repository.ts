import { initDatabase } from '../index'
import type { QuizPromptConfig } from '../schema/database'

export async function getAllQuizPromptConfigs(): Promise<QuizPromptConfig[]> {
  const db = await initDatabase()
  return db.getAll('quizPromptConfig')
}

export async function getQuizPromptConfig(id: string): Promise<QuizPromptConfig | undefined> {
  const db = await initDatabase()
  return db.get('quizPromptConfig', id)
}

export async function getActiveQuizPromptConfig(): Promise<QuizPromptConfig | undefined> {
  const db = await initDatabase()
  const configs = await db.getAll('quizPromptConfig')
  return configs.find(config => config.isActive)
}

export async function saveQuizPromptConfig(config: Omit<QuizPromptConfig, 'createdAt' | 'updatedAt'>): Promise<void> {
  const db = await initDatabase()
  const existing = await db.get('quizPromptConfig', config.id)
  const fullConfig: QuizPromptConfig = {
    ...config,
    createdAt: existing?.createdAt || Date.now(),
    updatedAt: Date.now()
  }
  await db.put('quizPromptConfig', fullConfig)
}

export async function createQuizPromptConfig(config: Omit<QuizPromptConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<QuizPromptConfig> {
  const db = await initDatabase()
  const newConfig: QuizPromptConfig = {
    ...config,
    id: `quiz-prompt-${Date.now()}`,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
  await db.put('quizPromptConfig', newConfig)
  return newConfig
}

export async function deleteQuizPromptConfig(id: string): Promise<void> {
  const db = await initDatabase()
  await db.delete('quizPromptConfig', id)
}

export async function setActiveQuizPromptConfig(id: string): Promise<void> {
  const db = await initDatabase()
  const configs = await db.getAll('quizPromptConfig')
  
  for (const config of configs) {
    config.isActive = config.id === id
    config.updatedAt = Date.now()
    await db.put('quizPromptConfig', config)
  }
}

export async function duplicateQuizPromptConfig(id: string): Promise<QuizPromptConfig | undefined> {
  const db = await initDatabase()
  const original = await db.get('quizPromptConfig', id)
  
  if (!original) return undefined
  
  const duplicate: QuizPromptConfig = {
    ...original,
    id: `quiz-prompt-${Date.now()}`,
    name: `${original.name} (Copy)`,
    isActive: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
  
  await db.put('quizPromptConfig', duplicate)
  return duplicate
}
