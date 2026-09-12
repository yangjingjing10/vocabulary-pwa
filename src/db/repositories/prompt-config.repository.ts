import { initDatabase } from '../index'
import type { PromptConfig } from '../schema/database'

export async function getAllPromptConfigs(): Promise<PromptConfig[]> {
  const db = await initDatabase()
  return db.getAll('promptConfig')
}

export async function getPromptConfig(id: string): Promise<PromptConfig | undefined> {
  const db = await initDatabase()
  return db.get('promptConfig', id)
}

export async function getActivePromptConfig(): Promise<PromptConfig | undefined> {
  const db = await initDatabase()
  const configs = await db.getAll('promptConfig')
  return configs.find(config => config.isActive)
}

export async function savePromptConfig(config: Omit<PromptConfig, 'createdAt' | 'updatedAt'>): Promise<void> {
  const db = await initDatabase()
  const existing = await db.get('promptConfig', config.id)
  const fullConfig: PromptConfig = {
    ...config,
    createdAt: existing?.createdAt || Date.now(),
    updatedAt: Date.now()
  }
  await db.put('promptConfig', fullConfig)
}

export async function createPromptConfig(config: Omit<PromptConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<PromptConfig> {
  const db = await initDatabase()
  const newConfig: PromptConfig = {
    ...config,
    id: `prompt-${Date.now()}`,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
  await db.put('promptConfig', newConfig)
  return newConfig
}

export async function deletePromptConfig(id: string): Promise<void> {
  const db = await initDatabase()
  await db.delete('promptConfig', id)
}

export async function setActivePromptConfig(id: string): Promise<void> {
  const db = await initDatabase()
  const configs = await db.getAll('promptConfig')
  
  for (const config of configs) {
    config.isActive = config.id === id
    config.updatedAt = Date.now()
    await db.put('promptConfig', config)
  }
}

export async function duplicatePromptConfig(id: string): Promise<PromptConfig | undefined> {
  const db = await initDatabase()
  const original = await db.get('promptConfig', id)
  
  if (!original) return undefined
  
  const duplicate: PromptConfig = {
    ...original,
    id: `prompt-${Date.now()}`,
    name: `${original.name} (Copy)`,
    isActive: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
  
  await db.put('promptConfig', duplicate)
  return duplicate
}
