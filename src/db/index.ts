import { openDB } from 'idb'

import { DB_NAME, DB_VERSION } from './constants'
import type { VocabularyDatabase } from './schema/database'

export async function initDatabase() {
  return openDB<VocabularyDatabase>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      // Version 1: words, apiConfig
      if (oldVersion < 1) {
        const wordsStore = db.createObjectStore('words', { keyPath: 'id' })
        wordsStore.createIndex('by-date', 'date')
        wordsStore.createIndex('by-added-at', 'addedAt')
        db.createObjectStore('apiConfig', { keyPath: 'id' })
      }
      
      // Version 2: promptConfig
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains('promptConfig')) {
          db.createObjectStore('promptConfig', { keyPath: 'id' })
        }
      }
      
      // Version 3: articles, dictionaryApis
      if (oldVersion < 3) {
        if (!db.objectStoreNames.contains('articles')) {
          const articlesStore = db.createObjectStore('articles', { keyPath: 'id' })
          articlesStore.createIndex('by-date', 'date')
          articlesStore.createIndex('by-created-at', 'createdAt')
        }
        
        if (!db.objectStoreNames.contains('dictionaryApis')) {
          const dictStore = db.createObjectStore('dictionaryApis', { keyPath: 'id' })
          
          // Initialize default dictionary API
          dictStore.put({
            id: 'free-dictionary',
            name: 'Free Dictionary API',
            url: 'https://api.dictionaryapi.dev/api/v2/entries/en/{word}',
            isDefault: true,
            enabled: true
          })
        }
      }
      
      // Version 4, 5, 6: translationRecords, userProfile
      if (oldVersion < 6) {
        if (!db.objectStoreNames.contains('translationRecords')) {
          console.log('Creating translationRecords store...')
          const translationStore = db.createObjectStore('translationRecords', { keyPath: 'id' })
          translationStore.createIndex('by-date', 'date')
          translationStore.createIndex('by-created-at', 'createdAt')
          console.log('✅ translationRecords store created!')
        } else {
          console.log('translationRecords store already exists')
        }
        
        if (!db.objectStoreNames.contains('userProfile')) {
          console.log('Creating userProfile store...')
          db.createObjectStore('userProfile', { keyPath: 'id' })
          console.log('✅ userProfile store created!')
        }
      }
      
      // Version 7: dictionaryApiConfigs
      if (oldVersion < 7) {
        if (!db.objectStoreNames.contains('dictionaryApiConfigs')) {
          console.log('Creating dictionaryApiConfigs store...')
          db.createObjectStore('dictionaryApiConfigs', { keyPath: 'id' })
          console.log('✅ dictionaryApiConfigs store created!')
        }
      }
      
      // Version 8: paragraphTranslations
      if (oldVersion < 8) {
        if (!db.objectStoreNames.contains('paragraphTranslations')) {
          console.log('Creating paragraphTranslations store...')
          db.createObjectStore('paragraphTranslations', { keyPath: 'id' })
          console.log('✅ paragraphTranslations store created!')
        }
      }
      
      // Version 9: quizPromptConfig
      if (oldVersion < 9) {
        if (!db.objectStoreNames.contains('quizPromptConfig')) {
          console.log('Creating quizPromptConfig store...')
          db.createObjectStore('quizPromptConfig', { keyPath: 'id' })
          console.log('✅ quizPromptConfig store created!')
        }
      }

      // Version 10: articleDrawings（文章涂鸦批注）
      if (oldVersion < 10) {
        if (!db.objectStoreNames.contains('articleDrawings')) {
          console.log('Creating articleDrawings store...')
          const store = db.createObjectStore('articleDrawings', { keyPath: 'id' })
          store.createIndex('by-article-id', 'articleId')
          console.log('✅ articleDrawings store created!')
        }
      }

      // Version 11: 本地离线英汉词库（ECDICT 精简包）
      if (oldVersion < 11) {
        if (!db.objectStoreNames.contains('localDict')) {
          db.createObjectStore('localDict', { keyPath: 'word' })
        }
        if (!db.objectStoreNames.contains('localDictMeta')) {
          db.createObjectStore('localDictMeta', { keyPath: 'id' })
        }
      }

      // Version 12: 选择题练习记录 + 错题进度
      if (oldVersion < 12) {
        if (!db.objectStoreNames.contains('choiceQuizRecords')) {
          const store = db.createObjectStore('choiceQuizRecords', { keyPath: 'id' })
          store.createIndex('by-date', 'date')
          store.createIndex('by-created-at', 'createdAt')
        }
        if (!db.objectStoreNames.contains('choicePracticeStates')) {
          db.createObjectStore('choicePracticeStates', { keyPath: 'id' })
        }
      }

      // Version 13: 兜底补建（热更新时可能版本已升但表未创建）
      if (oldVersion < 13) {
        if (!db.objectStoreNames.contains('choiceQuizRecords')) {
          const store = db.createObjectStore('choiceQuizRecords', { keyPath: 'id' })
          store.createIndex('by-date', 'date')
          store.createIndex('by-created-at', 'createdAt')
        }
        if (!db.objectStoreNames.contains('choicePracticeStates')) {
          db.createObjectStore('choicePracticeStates', { keyPath: 'id' })
        }
      }
    },
    blocked() {
      console.warn('[DB] 升级被阻塞：请关闭其它标签页后刷新')
    },
    blocking() {
      // 当前连接挡住了其它标签的升级时，主动关闭以放行
    },
  })
}
