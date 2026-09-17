/**
 * 单词测试相关类型定义
 */

/** 英→中：看英文写释义（已统一为此方向） */
export type QuizDirection = 'en-to-zh' | 'zh-to-en'

/** 题干展示形态：孤立单词 / 固定搭配 / 例句 */
export type QuizPromptMode = 'word' | 'phrase' | 'example'

export interface QuizQuestion {
  word: string
  /** 本地词典 / 词库释义（作答对照） */
  translation: string
  direction: QuizDirection
  /** 题干形态 */
  promptMode: QuizPromptMode
  /** 题干英文原文（单词 / 搭配 / 例句） */
  promptText: string
  userAnswer: string
  /** 本词已重练次数（错题循环） */
  retryCount: number
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
