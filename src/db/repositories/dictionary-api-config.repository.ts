import { initDatabase } from '../index'
import type { DictionaryApiConfig } from '../schema/database'

export async function saveDictionaryApiConfig(config: Omit<DictionaryApiConfig, 'updatedAt'>): Promise<void> {
  const db = await initDatabase()
  const fullConfig: DictionaryApiConfig = {
    ...config,
    updatedAt: Date.now()
  }
  await db.put('dictionaryApiConfigs', fullConfig)
}

export async function getAllDictionaryApiConfigs(): Promise<DictionaryApiConfig[]> {
  const db = await initDatabase()
  const configs = await db.getAll('dictionaryApiConfigs')
  return configs.sort((a, b) => a.priority - b.priority)
}

export async function getDictionaryApiConfig(id: string): Promise<DictionaryApiConfig | undefined> {
  const db = await initDatabase()
  return db.get('dictionaryApiConfigs', id)
}

export async function deleteDictionaryApiConfig(id: string): Promise<void> {
  const db = await initDatabase()
  await db.delete('dictionaryApiConfigs', id)
}

export async function getEnabledDictionaryApiConfigs(): Promise<DictionaryApiConfig[]> {
  const configs = await getAllDictionaryApiConfigs()
  return configs.filter(c => c.enabled)
}
