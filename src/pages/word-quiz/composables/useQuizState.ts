import { ref, computed } from 'vue'
import type { AnswerFeedback, QuizQuestion, QuizResult, QuizStatus } from '../types/quiz'
import {
  assignDirectionsFiftyFifty,
  checkQuizAnswer,
  getCorrectAnswer,
  resolveTranslations,
} from '../utils/quizAnswerMatch'

/**
 * 单词测试状态管理
 */
export function useQuizState(initialWords: string[]) {
  const questions = ref<QuizQuestion[]>([])
  const currentQuestionIndex = ref(0)
  const userAnswer = ref('')
  const results = ref<QuizResult[]>([])
  const status = ref<QuizStatus>('loading')
  const answerFeedback = ref<AnswerFeedback>(null)
  const isAnswerLocked = ref(false)

  const currentQuestion = computed(() => questions.value[currentQuestionIndex.value])

  const progress = computed(() =>
    `${currentQuestionIndex.value + 1} / ${questions.value.length}`,
  )

  const correctCount = computed(() =>
    results.value.filter((r) => r.isCorrect).length,
  )

  const skippedCount = computed(() =>
    results.value.filter((r) => r.skipped).length,
  )

  const accuracy = computed(() => {
    if (results.value.length === 0) return 0
    return Math.round((correctCount.value / results.value.length) * 100)
  })

  const incorrectResults = computed(() =>
    results.value.filter((r) => !r.isCorrect && !r.skipped),
  )

  const skippedResults = computed(() =>
    results.value.filter((r) => r.skipped),
  )

  const isCompleted = computed(() => status.value === 'completed')
  const isTesting = computed(() => status.value === 'testing')
  const isGrading = computed(() => status.value === 'grading')
  const isLoading = computed(() => status.value === 'loading')

  function buildQuestions(
    items: { word: string; translation: string }[],
  ): QuizQuestion[] {
    return assignDirectionsFiftyFifty(items).map((item) => ({
      word: item.word,
      translation: item.translation,
      direction: item.direction,
      userAnswer: '',
    }))
  }

  async function initializeQuiz() {
    status.value = 'loading'
    answerFeedback.value = null
    isAnswerLocked.value = false

    const translationMap = await resolveTranslations(initialWords)
    const items = initialWords.map((word) => ({
      word,
      translation: translationMap.get(word) || '',
    }))

    questions.value = buildQuestions(items)
    currentQuestionIndex.value = 0
    userAnswer.value = ''
    results.value = []
    status.value = 'testing'
  }

  function clearFeedback() {
    answerFeedback.value = null
  }

  /**
   * 提交：先记分，再切题；最后一题直接 finished
   */
  function submitCurrentAnswer(): 'advanced' | 'finished' | 'rejected' | 'skipped-empty' {
    const answer = userAnswer.value.trim()
    if (!answer) return 'skipped-empty'

    const index = currentQuestionIndex.value
    const question = questions.value[index]
    if (!question) return 'rejected'

    question.userAnswer = answer
    question.gradeResult = {
      isCorrect: checkQuizAnswer(question, answer),
      correctAnswer: getCorrectAnswer(question),
    }

    userAnswer.value = ''
    answerFeedback.value = null

    if (index >= questions.value.length - 1) {
      return 'finished'
    }

    currentQuestionIndex.value = index + 1
    return 'advanced'
  }

  /**
   * 跳过：记为不会，结果页展示释义
   */
  function skipQuestion(): 'advanced' | 'finished' | 'rejected' {
    const index = currentQuestionIndex.value
    const question = questions.value[index]
    if (!question) return 'rejected'

    question.userAnswer = ''
    question.gradeResult = {
      isCorrect: false,
      correctAnswer: getCorrectAnswer(question),
    }

    userAnswer.value = ''
    answerFeedback.value = null

    if (index >= questions.value.length - 1) {
      return 'finished'
    }

    currentQuestionIndex.value = index + 1
    return 'advanced'
  }

  function collectGradedResults(): QuizResult[] {
    return questions.value
      .filter((q) => q.gradeResult)
      .map((q) => {
        const skipped = !q.userAnswer.trim()
        return {
          word: q.word,
          userAnswer: skipped ? '' : q.userAnswer,
          correctAnswer: q.gradeResult!.correctAnswer,
          translation: q.translation,
          isCorrect: skipped ? false : q.gradeResult!.isCorrect,
          direction: q.direction,
          skipped,
        }
      })
  }

  function setResults(gradedResults: QuizResult[]) {
    results.value = gradedResults
    status.value = 'completed'
  }

  async function retryQuiz() {
    status.value = 'loading'
    answerFeedback.value = null
    isAnswerLocked.value = false

    const items = questions.value.map((q) => ({
      word: q.word,
      translation: q.translation,
    }))

    questions.value = buildQuestions(items)
    currentQuestionIndex.value = 0
    userAnswer.value = ''
    results.value = []
    status.value = 'testing'
  }

  function getAnsweredQuestions() {
    return questions.value
      .filter((q) => q.gradeResult)
      .map((q) => ({
        word: q.word,
        translation: q.translation,
        direction: q.direction,
        userAnswer: q.userAnswer,
        gradeResult: q.gradeResult,
      }))
  }

  function setStatus(newStatus: QuizStatus) {
    status.value = newStatus
  }

  return {
    questions,
    currentQuestionIndex,
    userAnswer,
    results,
    status,
    answerFeedback,
    isAnswerLocked,

    currentQuestion,
    progress,
    correctCount,
    skippedCount,
    accuracy,
    incorrectResults,
    skippedResults,
    isCompleted,
    isTesting,
    isGrading,
    isLoading,

    initializeQuiz,
    submitCurrentAnswer,
    skipQuestion,
    collectGradedResults,
    setResults,
    retryQuiz,
    getAnsweredQuestions,
    setStatus,
    clearFeedback,
  }
}
