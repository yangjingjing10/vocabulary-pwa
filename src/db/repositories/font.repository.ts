import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

import type { FontAsset, FontConfig } from '@/pages/profile/css/font/types/font'

interface FontSchema extends DBSchema {
  fontConfigs: {
    key: string
    value: FontConfig
  }
  fontAssets: {
    key: string
    value: FontAsset
  }
}

let db: IDBPDatabase<FontSchema> | null = null

/** 与壁纸相同：独立 IndexedDB；v2 增加字体资源库 */
async function getDB() {
  if (db) return db

  db = await openDB<FontSchema>('font-db', 2, {
    upgrade(database, oldVersion) {
      if (!database.objectStoreNames.contains('fontConfigs')) {
        database.createObjectStore('fontConfigs', { keyPath: 'id' })
      }
      if (oldVersion < 2 && !database.objectStoreNames.contains('fontAssets')) {
        database.createObjectStore('fontAssets', { keyPath: 'id' })
      }
    }
  })

  return db
}

export type { FontAsset, FontConfig }

// ---------- 字体资源库 ----------

export async function getAllFontAssets(): Promise<FontAsset[]> {
  const database = await getDB()
  const list = await database.getAll('fontAssets')
  return list.sort((a, b) => b.createdAt - a.createdAt)
}

export async function addFontAsset(asset: FontAsset): Promise<void> {
  const database = await getDB()
  await database.put('fontAssets', asset)
}

export async function getFontAsset(id: string): Promise<FontAsset | undefined> {
  const database = await getDB()
  return database.get('fontAssets', id)
}

export async function deleteFontAsset(id: string): Promise<void> {
  const database = await getDB()
  await database.delete('fontAssets', id)
}

// ---------- 字体配置 ----------

export async function getAllFontConfigs(): Promise<FontConfig[]> {
  const database = await getDB()
  const list = await database.getAll('fontConfigs')
  return list.sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function getFontConfig(id: string): Promise<FontConfig | undefined> {
  const database = await getDB()
  return database.get('fontConfigs', id)
}

export async function addFontConfig(config: FontConfig): Promise<void> {
  const database = await getDB()
  await database.add('fontConfigs', config)
}

export async function saveFontConfig(config: FontConfig): Promise<void> {
  const database = await getDB()
  await database.put('fontConfigs', config)
}

export async function deleteFontConfig(id: string): Promise<void> {
  const database = await getDB()
  await database.delete('fontConfigs', id)
}

export async function deleteFontConfigs(ids: string[]): Promise<void> {
  const database = await getDB()
  const tx = database.transaction('fontConfigs', 'readwrite')
  await Promise.all([...ids.map((id) => tx.store.delete(id)), tx.done])
}

export async function getCurrentFontConfig(): Promise<FontConfig | null> {
  const database = await getDB()
  const configs = await database.getAll('fontConfigs')
  return configs.find((c) => c.isSelected) || null
}

/** 将指定配置设为当前启用，并清除其余选中态 */
export async function setCurrentFontConfig(id: string): Promise<void> {
  const database = await getDB()
  const tx = database.transaction('fontConfigs', 'readwrite')
  const store = tx.objectStore('fontConfigs')
  const all = await store.getAll()

  for (const config of all) {
    config.isSelected = config.id === id
    if (config.id === id) {
      config.updatedAt = Date.now()
    }
    await store.put(config)
  }

  await tx.done
}

/** 清除全部选中态（恢复系统默认字体时使用） */
export async function clearCurrentFontConfig(): Promise<void> {
  const database = await getDB()
  const tx = database.transaction('fontConfigs', 'readwrite')
  const store = tx.objectStore('fontConfigs')
  const all = await store.getAll()

  for (const config of all) {
    if (config.isSelected) {
      config.isSelected = false
      await store.put(config)
    }
  }

  await tx.done
}
