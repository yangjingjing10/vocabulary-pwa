import { ref, computed } from 'vue'
import type { AnswerFeedback, QuizQuestion, QuizResult, QuizStatus } from '../types/quiz'
import {
  assignDirectionsFiftyFifty,
  checkQuizAnswer,
  getCorrectAnswer,
  resolveTranslations,
} from '../utils/quizAnswerMatch'

const CORRECT_FLASH_MS = 900
const WRONG_FLASH_MS = 900

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

  const accuracy = computed(() => {
    if (results.value.length === 0) return 0
    return Math.round((correctCount.value / results.value.length) * 100)
  })

  const incorrectResults = computed(() =>
    results.value.filter((r) => !r.isCorrect),
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

  /**
   * 初始化测试：本地词典补释义 + 英中五五开
   */
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
    if (answerFeedback.value === 'wrong') {
      answerFeedback.value = null
    }
  }

  /**
   * 提交当前答案：对/错都闪烁后进入下一题
   */
  async function submitCurrentAnswer(): Promise<'advanced' | 'finished' | 'rejected' | 'skipped-empty'> {
    if (isAnswerLocked.value) return 'rejected'

    const answer = userAnswer.value.trim()
    if (!answer) return 'skipped-empty'

    const question = questions.value[currentQuestionIndex.value]
    if (!question) return 'rejected'

    const isCorrect = checkQuizAnswer(question, answer)
    const correctAnswer = getCorrectAnswer(question)

    question.userAnswer = answer
    question.gradeResult = { isCorrect, correctAnswer }

    answerFeedback.value = isCorrect ? 'correct' : 'wrong'
    isAnswerLocked.value = true
    await sleep(isCorrect ? CORRECT_FLASH_MS : WRONG_FLASH_MS)
    isAnswerLocked.value = false
    answerFeedback.value = null
    userAnswer.value = ''

    if (currentQuestionIndex.value < questions.value.length - 1) {
      currentQuestionIndex.value++
      return 'advanced'
    }

    return 'finished'
  }

  /**
   * 跳过当前题（不保存答案）
   */
  function skipQuestion() {
    if (isAnswerLocked.value) return false

    const question = questions.value[currentQuestionIndex.value]
    if (question) {
      question.userAnswer = ''
      question.gradeResult = undefined
    }

    userAnswer.value = ''
    answerFeedback.value = null

    if (currentQuestionIndex.value < questions.value.length - 1) {
      currentQuestionIndex.value++
      return true
    }

    return false
  }

  /**
   * 从已作答题目汇总结果（本地判题，无需 AI）
   */
  function collectGradedResults(): QuizResult[] {
    return questions.value
      .filter((q) => q.userAnswer.trim() !== '' && q.gradeResult)
      .map((q) => ({
        word: q.word,
        userAnswer: q.userAnswer,
        correctAnswer: q.gradeResult!.correctAnswer,
        isCorrect: q.gradeResult!.isCorrect,
        direction: q.direction,
      }))
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
      .filter((q) => q.userAnswer.trim() !== '')
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
    accuracy,
    incorrectResults,
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

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}
