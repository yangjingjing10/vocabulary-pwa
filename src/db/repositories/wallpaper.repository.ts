import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

interface WallpaperSchema extends DBSchema {
  wallpapers: {
    key: string
    value: {
      id: string
      name: string
      imageData: string
      createdAt: number
      isSelected?: boolean
      blur?: number
      opacity?: number
    }
  }
  settings: {
    key: string
    value: WallpaperRotationSettings & { id: string }
  }
}

export interface WallpaperRotationSettings {
  enabled: boolean
  /** 轮换间隔（分钟） */
  intervalMinutes: number
}

const ROTATION_SETTINGS_KEY = 'rotation'
const DEFAULT_ROTATION_SETTINGS: WallpaperRotationSettings = {
  enabled: false,
  intervalMinutes: 5
}

let db: IDBPDatabase<WallpaperSchema> | null = null

async function getDB() {
  if (db) return db

  db = await openDB<WallpaperSchema>('wallpaper-db', 3, {
    upgrade(database, oldVersion) {
      if (!database.objectStoreNames.contains('wallpapers')) {
        database.createObjectStore('wallpapers', { keyPath: 'id' })
      }
      if (oldVersion < 3 && !database.objectStoreNames.contains('settings')) {
        database.createObjectStore('settings', { keyPath: 'id' })
      }
    }
  })

  return db
}

export interface Wallpaper {
  id: string
  name: string
  imageData: string
  createdAt: number
  isSelected?: boolean
  blur?: number
  opacity?: number
}

export async function getAllWallpapers(): Promise<Wallpaper[]> {
  const database = await getDB()
  return database.getAll('wallpapers')
}

export async function addWallpaper(wallpaper: Wallpaper): Promise<void> {
  const database = await getDB()
  await database.add('wallpapers', wallpaper)
}

export async function deleteWallpaper(id: string): Promise<void> {
  const database = await getDB()
  await database.delete('wallpapers', id)
}

export async function deleteWallpapers(ids: string[]): Promise<void> {
  const database = await getDB()
  const tx = database.transaction('wallpapers', 'readwrite')
  await Promise.all([
    ...ids.map(id => tx.store.delete(id)),
    tx.done
  ])
}

export async function getCurrentWallpaper(): Promise<Wallpaper | null> {
  const database = await getDB()
  const wallpapers = await database.getAll('wallpapers')
  const selected = wallpapers.find(w => w.isSelected)
  return selected || null
}

export async function setCurrentWallpaper(id: string): Promise<void> {
  const database = await getDB()
  const tx = database.transaction('wallpapers', 'readwrite')
  const store = tx.objectStore('wallpapers')
  
  const allWallpapers = await store.getAll()
  
  for (const wallpaper of allWallpapers) {
    wallpaper.isSelected = wallpaper.id === id
    await store.put(wallpaper)
  }
  
  await tx.done
}

export async function updateWallpaperSettings(
  id: string,
  settings: { blur?: number; opacity?: number }
): Promise<Wallpaper | null> {
  const database = await getDB()
  const wallpaper = await database.get('wallpapers', id)
  if (!wallpaper) return null

  if (settings.blur !== undefined) {
    wallpaper.blur = settings.blur
  }
  if (settings.opacity !== undefined) {
    wallpaper.opacity = settings.opacity
  }

  await database.put('wallpapers', wallpaper)
  return wallpaper
}

export async function getRotationSettings(): Promise<WallpaperRotationSettings> {
  const database = await getDB()
  const stored = await database.get('settings', ROTATION_SETTINGS_KEY)
  if (!stored) {
    return { ...DEFAULT_ROTATION_SETTINGS }
  }
  return {
    enabled: Boolean(stored.enabled),
    intervalMinutes: Math.min(60, Math.max(1, Number(stored.intervalMinutes) || DEFAULT_ROTATION_SETTINGS.intervalMinutes))
  }
}

export async function saveRotationSettings(
  settings: WallpaperRotationSettings
): Promise<WallpaperRotationSettings> {
  const database = await getDB()
  const normalized: WallpaperRotationSettings = {
    enabled: Boolean(settings.enabled),
    intervalMinutes: Math.min(60, Math.max(1, Math.round(settings.intervalMinutes)))
  }
  await database.put('settings', { id: ROTATION_SETTINGS_KEY, ...normalized })
  return normalized
}
