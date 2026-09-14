import type { QuizDirection } from './quiz'

/**
 * 单词测试暂停相关类型
 */

export interface QuizWord {
  id: string
  word: string
  translation?: string
  direction?: QuizDirection
  userAnswer: string
  /** 本地判题结果（历史字段名 aiResult，兼容已暂停批次） */
  aiResult?: {
    correct: boolean
    correctAnswer: string
    feedback?: string
    score?: number
  }
  answeredAt?: number
  skipped?: boolean
}

export interface QuizBatch {
  batchId: string
  /** 所属学习日，用于按日期隔离续测进度 */
  date?: string
  createdAt: number
  words: QuizWord[]
  status: 'ongoing' | 'paused' | 'finished'
  pausedAt?: number
  finishedAt?: number
  totalWords: number
  answeredCount: number
  correctCount?: number
  accuracy?: number
}

export interface QuizPauseResult {
  batchId: string
  checkedCount: number
  correctCount: number
  remainingCount: number
  results: QuizWord[]
}
