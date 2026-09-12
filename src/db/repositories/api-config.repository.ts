import { initDatabase } from '../index'
import type { ApiConfig } from '../schema/database'

const CONFIG_ID = 'default-api-config'

export async function saveApiConfig(config: Omit<ApiConfig, 'id' | 'updatedAt'>): Promise<void> {
  const db = await initDatabase()
  const fullConfig: ApiConfig = {
    ...config,
    id: CONFIG_ID,
    updatedAt: Date.now()
  }
  await db.put('apiConfig', fullConfig)
}

export async function getApiConfig(): Promise<ApiConfig | undefined> {
  const db = await initDatabase()
  return db.get('apiConfig', CONFIG_ID)
}

export async function deleteApiConfig(): Promise<void> {
  const db = await initDatabase()
  await db.delete('apiConfig', CONFIG_ID)
}
