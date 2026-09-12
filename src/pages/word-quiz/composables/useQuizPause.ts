import { ref, computed } from 'vue'
import type { QuizWord, QuizBatch, QuizPauseResult } from '../types/quizPause'
import type { QuizDirection } from '../types/quiz'
import { checkQuizAnswer, getCorrectAnswer } from '../utils/quizAnswerMatch'

const STORAGE_KEY = 'quiz_current_batch'

export type QuizBatchSeed = {
  word: string
  translation?: string
  direction?: QuizDirection
}

/**
 * 单词测试暂停 / 续测逻辑
 */
export function useQuizPause() {
  const currentBatch = ref<QuizBatch | null>(null)
  const isPausing = ref(false)

  function createBatch(seeds: QuizBatchSeed[]): QuizBatch {
    const batchId = `batch-${Date.now()}`
    const quizWords: QuizWord[] = seeds.map((seed, index) => ({
      id: `${batchId}-word-${index}`,
      word: seed.word,
      translation: seed.translation || '',
      direction: seed.direction || 'en-to-zh',
      userAnswer: '',
      answeredAt: undefined,
      skipped: false,
    }))

    const batch: QuizBatch = {
      batchId,
      createdAt: Date.now(),
      words: quizWords,
      status: 'ongoing',
      totalWords: seeds.length,
      answeredCount: 0,
    }

    currentBatch.value = batch
    saveBatchToStorage(batch)
    return batch
  }

  function loadUnfinishedBatch(): QuizBatch | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return null

      const batch: QuizBatch = JSON.parse(stored)

      if (batch.status === 'ongoing' || batch.status === 'paused') {
        // 还有未处理的题才算未完成
        if (getPendingWords(batch).length === 0) {
          localStorage.removeItem(STORAGE_KEY)
          return null
        }
        currentBatch.value = batch
        return batch
      }

      return null
    } catch (error) {
      console.error('Failed to load batch:', error)
      return null
    }
  }

  function saveBatchToStorage(batch: QuizBatch) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(batch))
    } catch (error) {
      console.error('Failed to save batch:', error)
    }
  }

  function clearBatch() {
    currentBatch.value = null
    localStorage.removeItem(STORAGE_KEY)
  }

  /** 用户已作答、等待/已完成判题 */
  function getAnsweredWords(batch: QuizBatch): QuizWord[] {
    return batch.words.filter(
      (w) => !w.skipped && Boolean(w.userAnswer?.trim()) && !w.aiResult,
    )
  }

  /** 仍需继续作答的题（未答且未跳过） */
  function getPendingWords(batch: QuizBatch): QuizWord[] {
    return batch.words.filter((w) => {
      if (w.skipped) return false
      if (w.aiResult) return false
      if (w.userAnswer && w.userAnswer.trim() !== '') return false
      return true
    })
  }

  /** @deprecated 使用 getPendingWords；保留别名避免旧调用报错 */
  function getUnansweredWords(batch: QuizBatch): QuizWord[] {
    return getPendingWords(batch)
  }

  function getCheckedWords(batch: QuizBatch): QuizWord[] {
    return batch.words.filter((w) => w.aiResult !== undefined || w.skipped)
  }

  function findWord(batch: QuizBatch, word: string): QuizWord | undefined {
    return batch.words.find((w) => w.word === word)
  }

  /** 同步单题进度到 batch 并立即落盘 */
  function syncQuestionProgress(
    batch: QuizBatch,
    payload: {
      word: string
      translation?: string
      direction?: QuizDirection
      userAnswer?: string
      skipped?: boolean
      gradeResult?: { isCorrect: boolean; correctAnswer: string }
    },
  ) {
    const target = findWord(batch, payload.word)
    if (!target) return

    if (payload.translation !== undefined) target.translation = payload.translation
    if (payload.direction !== undefined) target.direction = payload.direction

    if (payload.skipped) {
      target.skipped = true
      target.userAnswer = ''
      target.answeredAt = Date.now()
      target.aiResult = {
        correct: false,
        correctAnswer: payload.gradeResult?.correctAnswer || getCorrectAnswer({
          word: target.word,
          translation: target.translation || '',
          direction: target.direction || 'en-to-zh',
        }),
      }
    } else if (payload.userAnswer !== undefined) {
      target.skipped = false
      target.userAnswer = payload.userAnswer
      target.answeredAt = Date.now()
      if (payload.gradeResult) {
        target.aiResult = {
          correct: payload.gradeResult.isCorrect,
          correctAnswer: payload.gradeResult.correctAnswer,
        }
      }
    }

    batch.status = 'ongoing'
    batch.answeredCount = batch.words.filter(
      (w) => w.skipped || Boolean(w.userAnswer?.trim()) || w.aiResult,
    ).length
    saveBatchToStorage(batch)
  }

  async function pauseAndCheck(batch: QuizBatch): Promise<QuizPauseResult> {
    isPausing.value = true

    try {
      const answeredWords = getAnsweredWords(batch)
      const pendingWords = getPendingWords(batch)

      if (answeredWords.length > 0) {
        const checkedResults = gradeAnsweredWords(answeredWords)
        checkedResults.forEach((result) => {
          const wordIndex = batch.words.findIndex((w) => w.id === result.id)
          if (wordIndex !== -1) {
            batch.words[wordIndex] = result
          }
        })
      }

      batch.status = 'paused'
      batch.pausedAt = Date.now()
      batch.answeredCount = getCheckedWords(batch).length

      const checked = getCheckedWords(batch).filter((w) => !w.skipped)
      const correctCount = checked.filter((r) => r.aiResult?.correct).length

      saveBatchToStorage(batch)

      return {
        batchId: batch.batchId,
        checkedCount: checked.length,
        correctCount,
        remainingCount: pendingWords.length,
        results: checked,
      }
    } catch (error) {
      console.error('Pause and check failed:', error)
      throw error
    } finally {
      isPausing.value = false
    }
  }

  async function finishAndCheck(batch: QuizBatch): Promise<QuizPauseResult> {
    isPausing.value = true

    try {
      const answeredWords = getAnsweredWords(batch)

      if (answeredWords.length > 0) {
        const checkedResults = gradeAnsweredWords(answeredWords)
        checkedResults.forEach((result) => {
          const wordIndex = batch.words.findIndex((w) => w.id === result.id)
          if (wordIndex !== -1) {
            batch.words[wordIndex] = result
          }
        })
      }

      batch.status = 'finished'
      batch.finishedAt = Date.now()

      const allChecked = getCheckedWords(batch).filter((w) => !w.skipped)
      const correctCount = allChecked.filter((w) => w.aiResult?.correct).length

      batch.answeredCount = allChecked.length
      batch.correctCount = correctCount
      batch.accuracy =
        allChecked.length > 0
          ? Math.round((correctCount / allChecked.length) * 100)
          : 0

      saveBatchToStorage(batch)

      return {
        batchId: batch.batchId,
        checkedCount: answeredWords.length,
        correctCount,
        remainingCount: 0,
        results: allChecked,
      }
    } catch (error) {
      console.error('Finish and check failed:', error)
      throw error
    } finally {
      isPausing.value = false
    }
  }

  function gradeAnsweredWords(words: QuizWord[]): QuizWord[] {
    return words.map((w) => {
      const direction = w.direction || 'en-to-zh'
      const translation = w.translation || ''
      const question = { word: w.word, translation, direction }
      const correctAnswer = getCorrectAnswer(question)
      const correct = checkQuizAnswer(question, w.userAnswer)

      return {
        ...w,
        aiResult: {
          correct,
          correctAnswer,
        },
      }
    })
  }

  function updateWordAnswer(batch: QuizBatch, wordId: string, answer: string) {
    const wordIndex = batch.words.findIndex((w) => w.id === wordId)
    if (wordIndex !== -1) {
      batch.words[wordIndex].userAnswer = answer
      batch.words[wordIndex].answeredAt = Date.now()
      batch.words[wordIndex].skipped = false
      saveBatchToStorage(batch)
    }
  }

  function markBatchPaused(batch: QuizBatch) {
    batch.status = 'paused'
    batch.pausedAt = Date.now()
    saveBatchToStorage(batch)
  }

  const batchStats = computed(() => {
    if (!currentBatch.value) return null

    const batch = currentBatch.value
    const checked = getCheckedWords(batch)
    const answered = getAnsweredWords(batch)
    const unanswered = getPendingWords(batch)

    return {
      total: batch.words.length,
      checked: checked.length,
      answered: answered.length,
      unanswered: unanswered.length,
      correctCount: checked.filter((w) => w.aiResult?.correct).length,
    }
  })

  return {
    currentBatch,
    isPausing,
    batchStats,
    createBatch,
    loadUnfinishedBatch,
    clearBatch,
    pauseAndCheck,
    finishAndCheck,
    updateWordAnswer,
    syncQuestionProgress,
    markBatchPaused,
    getAnsweredWords,
    getUnansweredWords,
    getPendingWords,
    getCheckedWords,
    saveBatchToStorage,
  }
}
