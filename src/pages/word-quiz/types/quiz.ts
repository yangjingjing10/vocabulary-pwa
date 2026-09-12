/**
 * 单词测试相关类型定义
 */

/** 英→中：看英文写释义；中→英：看释义写英文 */
export type QuizDirection = 'en-to-zh' | 'zh-to-en'

export interface QuizQuestion {
  word: string
  /** 本地词典 / 词库释义（作答对照） */
  translation: string
  direction: QuizDirection
  userAnswer: string
  /** 即时判题结果（回车确认后写入） */
  gradeResult?: {
    isCorrect: boolean
    correctAnswer: string
  }
}

export interface QuizResult {
  word: string
  userAnswer: string
  correctAnswer: string
  /** 完整释义，结果页回顾用 */
  translation?: string
  isCorrect: boolean
  direction?: QuizDirection
  /** 空回车跳过（通常表示不会） */
  skipped?: boolean
}

export type QuizStatus = 'loading' | 'testing' | 'grading' | 'completed'

export type AnswerFeedback = 'correct' | 'wrong' | null
