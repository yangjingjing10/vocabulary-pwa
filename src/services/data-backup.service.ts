import { openDB } from 'idb'

import { initDatabase } from '@/db/index'
import { todayLocalDate } from '@/utils/localDate'

export const BACKUP_FORMAT = 'ai-context-vocabulary-backup'
export const BACKUP_VERSION = 1

const QUIZ_STORAGE_KEY = 'quiz_current_batch'
const FONT_SIZE_STORAGE_KEY = 'app_font_size'

/** 用户数据表（排除可重建的离线大词库 localDict / localDictMeta / localPhraseIndex / localLookalikeIndex / localExampleIndex） */
const MAIN_USER_STORES = [
  'words',
  'apiConfig',
  'promptConfig',
  'quizPromptConfig',
  'articles',
  'translationRecords',
  'dictionaryApis',
  'dictionaryApiConfigs',
  'userProfile',
  'paragraphTranslations',
  'articleDrawings',
  'choiceQuizRecords',
  'choicePracticeStates',
] as const

type MainUserStore = (typeof MAIN_USER_STORES)[number]

export interface BackupPayload {
  format: typeof BACKUP_FORMAT
  version: number
  exportedAt: string
  databases: {
    'vocabulary-app': Partial<Record<MainUserStore, unknown[]>>
    'wallpaper-db': {
      wallpapers: unknown[]
      settings: unknown[]
    }
    'font-db': {
      fontConfigs: unknown[]
      fontAssets: unknown[]
    }
  }
  localStorage: {
    quiz_current_batch: string | null
    app_font_size: string | null
  }
  meta: {
    excludedStores: string[]
    note: string
  }
}

export interface BackupSummary {
  words: number
  articles: number
  wallpapers: number
  fontConfigs: number
  exportedAt?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

async function openWallpaperDb() {
  return openDB('wallpaper-db', 3, {
    upgrade(database, oldVersion) {
      if (!database.objectStoreNames.contains('wallpapers')) {
        database.createObjectStore('wallpapers', { keyPath: 'id' })
      }
      if (oldVersion < 3 && !database.objectStoreNames.contains('settings')) {
        database.createObjectStore('settings', { keyPath: 'id' })
      }
    },
  })
}

async function openFontDb() {
  return openDB('font-db', 2, {
    upgrade(database, oldVersion) {
      if (!database.objectStoreNames.contains('fontConfigs')) {
        database.createObjectStore('fontConfigs', { keyPath: 'id' })
      }
      if (oldVersion < 2 && !database.objectStoreNames.contains('fontAssets')) {
        database.createObjectStore('fontAssets', { keyPath: 'id' })
      }
    },
  })
}

async function replaceStoreRecords(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: { transaction: (store: any, mode: 'readwrite') => any },
  storeName: string,
  records: unknown[],
) {
  const tx = db.transaction(storeName, 'readwrite')
  const store = tx.objectStore(storeName)
  await store.clear()
  for (const record of records) {
    await store.put(record)
  }
  await tx.done
}

export async function collectBackupSummary(): Promise<BackupSummary> {
  const [mainDb, wallpaperDb, fontDb] = await Promise.all([
    initDatabase(),
    openWallpaperDb(),
    openFontDb(),
  ])

  const [words, articles, wallpapers, fontConfigs] = await Promise.all([
    mainDb.getAll('words'),
    mainDb.getAll('articles'),
    wallpaperDb.getAll('wallpapers'),
    fontDb.getAll('fontConfigs'),
  ])

  return {
    words: words.length,
    articles: articles.length,
    wallpapers: wallpapers.length,
    fontConfigs: fontConfigs.length,
  }
}

export async function exportAllData(): Promise<BackupPayload> {
  const [mainDb, wallpaperDb, fontDb] = await Promise.all([
    initDatabase(),
    openWallpaperDb(),
    openFontDb(),
  ])

  const mainData: BackupPayload['databases']['vocabulary-app'] = {}
  for (const storeName of MAIN_USER_STORES) {
    if (!mainDb.objectStoreNames.contains(storeName)) continue
    mainData[storeName] = await mainDb.getAll(storeName)
  }

  const [wallpapers, settings, fontConfigs, fontAssets] = await Promise.all([
    wallpaperDb.getAll('wallpapers'),
    wallpaperDb.objectStoreNames.contains('settings')
      ? wallpaperDb.getAll('settings')
      : Promise.resolve([]),
    fontDb.getAll('fontConfigs'),
    fontDb.objectStoreNames.contains('fontAssets')
      ? fontDb.getAll('fontAssets')
      : Promise.resolve([]),
  ])

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    databases: {
      'vocabulary-app': mainData,
      'wallpaper-db': {
        wallpapers,
        settings,
      },
      'font-db': {
        fontConfigs,
        fontAssets,
      },
    },
    localStorage: {
      quiz_current_batch: localStorage.getItem(QUIZ_STORAGE_KEY),
      app_font_size: localStorage.getItem(FONT_SIZE_STORAGE_KEY),
    },
    meta: {
      excludedStores: [
        'localDict',
        'localDictMeta',
        'localPhraseIndex',
        'localLookalikeIndex',
        'localExampleIndex',
      ],
      note: '本地离线大词库、短语、形近与例句索引未包含在备份中，恢复后会自动重建。',
    },
  }
}

export function downloadBackupJson(payload: BackupPayload) {
  const date = todayLocalDate()
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `vocabulary-backup-${date}.json`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export function parseBackupJson(raw: string): BackupPayload {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('备份文件不是合法 JSON')
  }

  if (!isRecord(parsed)) {
    throw new Error('备份文件格式无效')
  }

  if (parsed.format !== BACKUP_FORMAT) {
    throw new Error('不是本应用的备份文件')
  }

  if (typeof parsed.version !== 'number') {
    throw new Error('备份文件缺少版本号')
  }

  if (!isRecord(parsed.databases)) {
    throw new Error('备份文件缺少 databases 字段')
  }

  return parsed as unknown as BackupPayload
}

export async function importAllData(payload: BackupPayload): Promise<BackupSummary> {
  const mainDb = await initDatabase()
  const wallpaperDb = await openWallpaperDb()
  const fontDb = await openFontDb()

  const mainData = payload.databases?.['vocabulary-app'] || {}
  for (const storeName of MAIN_USER_STORES) {
    if (!mainDb.objectStoreNames.contains(storeName)) continue
    const records = Array.isArray(mainData[storeName]) ? mainData[storeName]! : []
    await replaceStoreRecords(mainDb, storeName, records)
  }

  const wallpaperData = payload.databases?.['wallpaper-db'] || { wallpapers: [], settings: [] }
  await replaceStoreRecords(
    wallpaperDb,
    'wallpapers',
    Array.isArray(wallpaperData.wallpapers) ? wallpaperData.wallpapers : [],
  )
  if (wallpaperDb.objectStoreNames.contains('settings')) {
    await replaceStoreRecords(
      wallpaperDb,
      'settings',
      Array.isArray(wallpaperData.settings) ? wallpaperData.settings : [],
    )
  }

  const fontData = payload.databases?.['font-db'] || { fontConfigs: [], fontAssets: [] }
  await replaceStoreRecords(
    fontDb,
    'fontConfigs',
    Array.isArray(fontData.fontConfigs) ? fontData.fontConfigs : [],
  )
  if (fontDb.objectStoreNames.contains('fontAssets')) {
    await replaceStoreRecords(
      fontDb,
      'fontAssets',
      Array.isArray(fontData.fontAssets) ? fontData.fontAssets : [],
    )
  }

  const quizBatch = payload.localStorage?.quiz_current_batch
  if (typeof quizBatch === 'string' && quizBatch.length > 0) {
    localStorage.setItem(QUIZ_STORAGE_KEY, quizBatch)
  } else {
    localStorage.removeItem(QUIZ_STORAGE_KEY)
  }

  const fontSize = payload.localStorage?.app_font_size
  if (typeof fontSize === 'string' && fontSize.length > 0) {
    localStorage.setItem(FONT_SIZE_STORAGE_KEY, fontSize)
  } else {
    localStorage.removeItem(FONT_SIZE_STORAGE_KEY)
  }

  return {
    words: Array.isArray(mainData.words) ? mainData.words.length : 0,
    articles: Array.isArray(mainData.articles) ? mainData.articles.length : 0,
    wallpapers: Array.isArray(wallpaperData.wallpapers) ? wallpaperData.wallpapers.length : 0,
    fontConfigs: Array.isArray(fontData.fontConfigs) ? fontData.fontConfigs.length : 0,
    exportedAt: payload.exportedAt,
  }
}

export function summarizePayload(payload: BackupPayload): BackupSummary {
  const mainData = payload.databases?.['vocabulary-app'] || {}
  const wallpaperData = payload.databases?.['wallpaper-db'] || { wallpapers: [] }
  const fontData = payload.databases?.['font-db'] || { fontConfigs: [] }

  return {
    words: Array.isArray(mainData.words) ? mainData.words.length : 0,
    articles: Array.isArray(mainData.articles) ? mainData.articles.length : 0,
    wallpapers: Array.isArray(wallpaperData.wallpapers) ? wallpaperData.wallpapers.length : 0,
    fontConfigs: Array.isArray(fontData.fontConfigs) ? fontData.fontConfigs.length : 0,
    exportedAt: payload.exportedAt,
  }
}
