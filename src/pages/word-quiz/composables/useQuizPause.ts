import { ref, computed, toValue, type MaybeRefOrGetter } from 'vue'
import type { QuizWord, QuizBatch, QuizPauseResult } from '../types/quizPause'
import type { QuizDirection } from '../types/quiz'
import { checkQuizAnswer, getCorrectAnswer } from '../utils/quizAnswerMatch'

const LEGACY_STORAGE_KEY = 'quiz_current_batch'
const REVIEW_STORAGE_KEY = 'quiz_review_batch'

export type QuizPauseNamespace = 'practice' | 'review'

export type QuizBatchSeed = {
  word: string
  translation?: string
  direction?: QuizDirection
}

function storageKeyFor(date: string, namespace: QuizPauseNamespace): string {
  const d = date.trim()
  const base = namespace === 'review' ? REVIEW_STORAGE_KEY : LEGACY_STORAGE_KEY
  return d ? `${base}:${d}` : base
}

function countPendingWords(batch: QuizBatch): number {
  return batch.words.filter((w) => {
    if (w.skipped) return false
    if (w.aiResult) return false
    if (w.userAnswer && w.userAnswer.trim() !== '') return false
    return true
  }).length
}

/**
 * 只读查看是否有未完成暂停批次（首页点「复习」时先判断是否应直接续测）
 */
export function peekUnfinishedQuizBatch(
  date: string,
  namespace: QuizPauseNamespace = 'practice',
): { batch: QuizBatch; remainingCount: number } | null {
  try {
    const key = storageKeyFor(date, namespace)
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const batch: QuizBatch = JSON.parse(raw)
    if (batch.status !== 'ongoing' && batch.status !== 'paused') return null
    const remainingCount = countPendingWords(batch)
    if (remainingCount === 0) return null
    const d = date.trim()
    if (d && batch.date && batch.date !== d) return null
    return { batch, remainingCount }
  } catch {
    return null
  }
}

/**
 * 单词测试暂停 / 续测逻辑（按日期 + 练习/复习命名空间隔离，互不覆盖）
 */
export function useQuizPause(
  date?: MaybeRefOrGetter<string>,
  namespace: MaybeRefOrGetter<QuizPauseNamespace> = 'practice',
) {
  const currentBatch = ref<QuizBatch | null>(null)
  const isPausing = ref(false)

  function getStorageKey() {
    const ns = toValue(namespace) === 'review' ? 'review' : 'practice'
    return storageKeyFor(toValue(date) || '', ns)
  }

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
      date: (toValue(date) || '').trim() || undefined,
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

  function readStoredBatch(raw: string | null): QuizBatch | null {
    if (!raw) return null
    try {
      const batch: QuizBatch = JSON.parse(raw)
      if (batch.status !== 'ongoing' && batch.status !== 'paused') return null
      if (getPendingWords(batch).length === 0) return null

      const d = (toValue(date) || '').trim()
      if (d && batch.date && batch.date !== d) return null

      return batch
    } catch (error) {
      console.error('Failed to parse batch:', error)
      return null
    }
  }

  function loadUnfinishedBatch(): QuizBatch | null {
    try {
      const key = getStorageKey()
      let batch = readStoredBatch(localStorage.getItem(key))

      // 仅练习命名空间兼容旧版全局 key；复习从不读取练习进度
      const ns = toValue(namespace) === 'review' ? 'review' : 'practice'
      if (!batch && ns === 'practice' && key !== LEGACY_STORAGE_KEY) {
        const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY)
        const legacy = readStoredBatch(legacyRaw)
        if (legacy) {
          const d = (toValue(date) || '').trim()
          if (!d || !legacy.date || legacy.date === d) {
            if (d && !legacy.date) legacy.date = d
            batch = legacy
            saveBatchToStorage(legacy)
            localStorage.removeItem(LEGACY_STORAGE_KEY)
          }
        }
      }

      if (!batch) return null

      currentBatch.value = batch
      return batch
    } catch (error) {
      console.error('Failed to load batch:', error)
      return null
    }
  }

  function saveBatchToStorage(batch: QuizBatch) {
    try {
      const d = (toValue(date) || '').trim()
      if (d && !batch.date) batch.date = d
      localStorage.setItem(getStorageKey(), JSON.stringify(batch))
    } catch (error) {
      console.error('Failed to save batch:', error)
    }
  }

  function clearBatch() {
    currentBatch.value = null
    try {
      localStorage.removeItem(getStorageKey())
    } catch (error) {
      console.error('Failed to clear batch:', error)
    }
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

  function getWrongWords(batch: QuizBatch): string[] {
    return getCheckedWords(batch)
      .filter((w) => w.skipped || w.aiResult?.correct === false)
      .map((w) => w.word)
      .filter(Boolean)
  }

  function findWord(batch: QuizBatch, word: string): QuizWord | undefined {
    const key = word.trim().toLowerCase()
    return batch.words.find((w) => w.word.trim().toLowerCase() === key)
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
    getWrongWords,
    saveBatchToStorage,
  }
}
