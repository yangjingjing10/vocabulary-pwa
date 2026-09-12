import type { DBSchema } from 'idb'

export interface VocabularyWord {
  id: string
  word: string
  phonetic?: string
  pos?: string
  translation?: string
  source: 'ocr' | 'manual' | 'file'
  addedAt: number
  date: string
}

export interface ApiConfig {
  id: string
  baseUrl: string
  apiKey: string
  textModel: string
  useIndependentVision: boolean
  visionBaseUrl: string
  visionApiKey: string
  visionModel: string
  updatedAt: number
}

export interface PromptConfig {
  id: string
  name: string
  content: string
  isActive: boolean
  createdAt: number
  updatedAt: number
}

export interface QuizPromptConfig {
  id: string
  name: string
  content: string
  isActive: boolean
  createdAt: number
  updatedAt: number
}

export interface UserProfile {
  id: string
  name: string
  avatar: string
  bio: string
  backgroundImage?: string
  updatedAt: number
}

export interface Article {
  id: string
  title: string
  content: string
  words: string[]
  date: string
  createdAt: number
}

export interface TranslationRecord {
  id: string
  date: string
  chineseText: string
  userTranslation: string
  score: number
  feedback: string
  referenceTranslations: string[]
  wordUsage: Record<string, {
    used: boolean
    correct: boolean
    suggestion: string
  }>
  relatedWords: string[]
  createdAt: number
}

export interface DictionaryApi {
  id: string
  name: string
  url: string
  isDefault: boolean
  enabled: boolean
}

export interface DictionaryApiConfig {
  id: string
  name: string
  enabled: boolean
  priority: number
  apiKey: string
  apiSecret?: string
  endpoint: string
  provider: 'youdao' | 'iciba' | 'baidu' | 'custom'
  updatedAt: number
}

export interface ParagraphTranslation {
  id: string
  articleId: string
  paragraphIndex: number
  userTranslation: string
  aiRevisedTranslation?: string
  updatedAt: number
}

/** 单笔涂鸦路径（坐标相对所属段落文本盒子，归一化到 0~1） */
export interface DrawingStroke {
  id: string
  /** 锚定段落索引；缺省视为旧数据，加载时丢弃 */
  paragraphIndex?: number
  color: string
  width: number
  points: { x: number; y: number }[]
  createdAt: number
}

/** 一篇文章的涂鸦批注（按 articleId 独立保存，重新生成不影响旧文） */
export interface ArticleDrawing {
  id: string
  articleId: string
  strokes: DrawingStroke[]
  updatedAt: number
}

/** 本地离线英汉词条（来自 ECDICT 精简包） */
export interface LocalDictEntry {
  word: string
  phonetic: string
  translation: string
  pos: string
  tag: string
}

/** 本地词库元信息（是否已导入、版本等） */
export interface LocalDictMeta {
  id: 'core'
  version: number
  count: number
  importedAt: number
  source: string
}

/** 单道选择题作答明细 */
export interface ChoiceQuizRecordDetail {
  word: string
  question: string
  options?: string[]
  userAnswer: string
  correctAnswer: string
  isCorrect: boolean
  explanation?: string
}

/** 一次选择题练习记录（存入学习记录） */
export interface ChoiceQuizRecord {
  id: string
  date: string
  total: number
  correct: number
  wrong: number
  accuracy: number
  words: string[]
  details: ChoiceQuizRecordDetail[]
  createdAt: number
}

/**
 * 某日选择题练习进度：待练错词 + 已练过的词（避免重复出题）
 * key 使用 date
 */
export interface ChoicePracticeState {
  id: string
  date: string
  pendingWrongWords: string[]
  practicedWords: string[]
  updatedAt: number
}

export interface VocabularyDatabase extends DBSchema {
  words: {
    key: string
    value: VocabularyWord
    indexes: {
      'by-date': string
      'by-added-at': number
    }
  }
  apiConfig: {
    key: string
    value: ApiConfig
  }
  promptConfig: {
    key: string
    value: PromptConfig
  }
  quizPromptConfig: {
    key: string
    value: QuizPromptConfig
  }
  articles: {
    key: string
    value: Article
    indexes: {
      'by-date': string
      'by-created-at': number
    }
  }
  translationRecords: {
    key: string
    value: TranslationRecord
    indexes: {
      'by-date': string
      'by-created-at': number
    }
  }
  dictionaryApis: {
    key: string
    value: DictionaryApi
  }
  dictionaryApiConfigs: {
    key: string
    value: DictionaryApiConfig
  }
  userProfile: {
    key: string
    value: UserProfile
  }
  paragraphTranslations: {
    key: string
    value: ParagraphTranslation
  }
  articleDrawings: {
    key: string
    value: ArticleDrawing
    indexes: {
      'by-article-id': string
    }
  }
  localDict: {
    key: string
    value: LocalDictEntry
  }
  localDictMeta: {
    key: string
    value: LocalDictMeta
  }
  choiceQuizRecords: {
    key: string
    value: ChoiceQuizRecord
    indexes: {
      'by-date': string
      'by-created-at': number
    }
  }
  choicePracticeStates: {
    key: string
    value: ChoicePracticeState
  }
}
