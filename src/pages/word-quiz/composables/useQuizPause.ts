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

  function getAnsweredWords(batch: QuizBatch): QuizWord[] {
    return batch.words.filter(
      (w) => w.userAnswer && w.userAnswer.trim() !== '' && !w.aiResult,
    )
  }

  function getUnansweredWords(batch: QuizBatch): QuizWord[] {
    return batch.words.filter((w) => !w.userAnswer || w.userAnswer.trim() === '')
  }

  function getCheckedWords(batch: QuizBatch): QuizWord[] {
    return batch.words.filter((w) => w.aiResult !== undefined)
  }

  async function pauseAndCheck(batch: QuizBatch): Promise<QuizPauseResult> {
    isPausing.value = true

    try {
      const answeredWords = getAnsweredWords(batch)
      const unansweredWords = getUnansweredWords(batch)

      if (answeredWords.length === 0) {
        batch.status = 'paused'
        batch.pausedAt = Date.now()
        saveBatchToStorage(batch)

        return {
          batchId: batch.batchId,
          checkedCount: 0,
          correctCount: 0,
          remainingCount: unansweredWords.length,
          results: [],
        }
      }

      const checkedResults = gradeAnsweredWords(answeredWords)

      checkedResults.forEach((result) => {
        const wordIndex = batch.words.findIndex((w) => w.id === result.id)
        if (wordIndex !== -1) {
          batch.words[wordIndex] = result
        }
      })

      batch.status = 'paused'
      batch.pausedAt = Date.now()
      batch.answeredCount = getCheckedWords(batch).length

      const correctCount = checkedResults.filter((r) => r.aiResult?.correct).length

      saveBatchToStorage(batch)

      return {
        batchId: batch.batchId,
        checkedCount: answeredWords.length,
        correctCount,
        remainingCount: unansweredWords.length,
        results: checkedResults,
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

      if (answeredWords.length === 0) {
        batch.status = 'finished'
        batch.finishedAt = Date.now()

        const allChecked = getCheckedWords(batch)
        const correctCount = allChecked.filter((w) => w.aiResult?.correct).length

        batch.correctCount = correctCount
        batch.accuracy =
          allChecked.length > 0
            ? Math.round((correctCount / allChecked.length) * 100)
            : 0

        saveBatchToStorage(batch)

        return {
          batchId: batch.batchId,
          checkedCount: 0,
          correctCount,
          remainingCount: 0,
          results: allChecked,
        }
      }

      const checkedResults = gradeAnsweredWords(answeredWords)

      checkedResults.forEach((result) => {
        const wordIndex = batch.words.findIndex((w) => w.id === result.id)
        if (wordIndex !== -1) {
          batch.words[wordIndex] = result
        }
      })

      batch.status = 'finished'
      batch.finishedAt = Date.now()

      const allChecked = getCheckedWords(batch)
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

  /** 本地词典判题（同步） */
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
      saveBatchToStorage(batch)
    }
  }

  const batchStats = computed(() => {
    if (!currentBatch.value) return null

    const batch = currentBatch.value
    const checked = getCheckedWords(batch)
    const answered = getAnsweredWords(batch)
    const unanswered = getUnansweredWords(batch)

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
    getAnsweredWords,
    getUnansweredWords,
    getCheckedWords,
  }
}
