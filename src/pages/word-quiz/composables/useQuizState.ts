import { ref, computed } from 'vue'
import type { AnswerFeedback, QuizQuestion, QuizResult, QuizStatus } from '../types/quiz'
import {
  assignEnToZh,
  checkQuizAnswer,
  getCorrectAnswer,
  resolveTranslations,
} from '../utils/quizAnswerMatch'
import { pickQuizPrompt } from '../utils/quizPrompt'

/** 练习：错题再入队 1 次；复习：错题持续回炉，答对才搁置 */
const PRACTICE_MAX_RETRIES = 1
const REVIEW_MAX_RETRIES = 8

export interface UseQuizStateOptions {
  /** 复习模式：答错继续出现，答对暂时搁置 */
  reviewMode?: boolean
}

/**
 * 单词测试状态管理
 */
export function useQuizState(initialWords: string[], options: UseQuizStateOptions = {}) {
  const isReviewMode = Boolean(options.reviewMode)
  const maxRetries = isReviewMode ? REVIEW_MAX_RETRIES : PRACTICE_MAX_RETRIES

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

  const feedbackCorrectAnswer = computed(() => {
    const q = currentQuestion.value
    return q?.gradeResult?.correctAnswer || ''
  })

  async function buildQuestion(
    word: string,
    translation: string,
    retryCount = 0,
    preferNot?: QuizQuestion['promptMode'],
  ): Promise<QuizQuestion> {
    const prompt = await pickQuizPrompt(word, { preferNot })
    return {
      word,
      translation,
      direction: 'en-to-zh',
      promptMode: prompt.mode,
      promptText: prompt.text,
      userAnswer: '',
      retryCount,
    }
  }

  async function buildQuestions(
    items: { word: string; translation: string }[],
  ): Promise<QuizQuestion[]> {
    const ordered = assignEnToZh(items)
    return Promise.all(
      ordered.map((item) => buildQuestion(item.word, item.translation)),
    )
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

    questions.value = await buildQuestions(items)
    currentQuestionIndex.value = 0
    userAnswer.value = ''
    results.value = []
    status.value = 'testing'
  }

  function clearFeedback() {
    answerFeedback.value = null
    isAnswerLocked.value = false
  }

  /**
   * 提交答案：判题并锁定，等待用户确认反馈后再切题
   */
  function submitCurrentAnswer(): 'feedback' | 'rejected' | 'skipped-empty' {
    if (isAnswerLocked.value) return 'rejected'

    const answer = userAnswer.value.trim()
    if (!answer) return 'skipped-empty'

    const index = currentQuestionIndex.value
    const question = questions.value[index]
    if (!question) return 'rejected'

    question.userAnswer = answer
    const isCorrect = checkQuizAnswer(question, answer)
    question.gradeResult = {
      isCorrect,
      correctAnswer: getCorrectAnswer(question),
    }

    answerFeedback.value = isCorrect ? 'correct' : 'wrong'
    isAnswerLocked.value = true
    return 'feedback'
  }

  /**
   * 跳过：记为不会，展示正确答案后等待确认
   */
  function skipQuestion(): 'feedback' | 'rejected' {
    if (isAnswerLocked.value) return 'rejected'

    const index = currentQuestionIndex.value
    const question = questions.value[index]
    if (!question) return 'rejected'

    question.userAnswer = ''
    question.gradeResult = {
      isCorrect: false,
      correctAnswer: getCorrectAnswer(question),
    }

    answerFeedback.value = 'wrong'
    isAnswerLocked.value = true
    return 'feedback'
  }

  /**
   * 错题（或跳过）在未达上限时再入队一次，换一种题干形态优先
   */
  async function maybeRequeueWrong(question: QuizQuestion): Promise<void> {
    const skipped = !question.userAnswer.trim()
    const failed = skipped || !question.gradeResult?.isCorrect
    if (!failed) return
    if (question.retryCount >= maxRetries) return

    const next = await buildQuestion(
      question.word,
      question.translation,
      question.retryCount + 1,
      question.promptMode,
    )
    questions.value.push(next)
  }

  /**
   * 确认反馈后前进；必要时先把错题追加到队尾
   */
  async function acknowledgeFeedback(): Promise<'advanced' | 'finished' | 'rejected'> {
    if (!isAnswerLocked.value) return 'rejected'

    const index = currentQuestionIndex.value
    const question = questions.value[index]
    if (!question?.gradeResult) return 'rejected'

    await maybeRequeueWrong(question)

    clearFeedback()
    userAnswer.value = ''

    if (index >= questions.value.length - 1) {
      return 'finished'
    }

    currentQuestionIndex.value = index + 1
    return 'advanced'
  }

  /** 按单词汇总：最终以最后一次作答为准；若曾答对则记为正确 */
  function collectGradedResults(): QuizResult[] {
    const byWord = new Map<string, QuizResult>()

    for (const q of questions.value) {
      if (!q.gradeResult) continue
      const skipped = !q.userAnswer.trim()
      const next: QuizResult = {
        word: q.word,
        userAnswer: skipped ? '' : q.userAnswer,
        correctAnswer: q.gradeResult.correctAnswer,
        translation: q.translation,
        isCorrect: skipped ? false : q.gradeResult.isCorrect,
        direction: q.direction,
        skipped,
      }

      const prev = byWord.get(q.word)
      if (!prev) {
        byWord.set(q.word, next)
        continue
      }
      // 后一次覆盖；若此前已对而本次又错（不应出现），仍保留对
      if (prev.isCorrect && !next.isCorrect) continue
      byWord.set(q.word, next)
    }

    return [...byWord.values()]
  }

  function setResults(gradedResults: QuizResult[]) {
    results.value = gradedResults
    status.value = 'completed'
  }

  async function retryQuiz() {
    status.value = 'loading'
    answerFeedback.value = null
    isAnswerLocked.value = false

    const items = questions.value
      .filter((q, i, arr) => arr.findIndex((x) => x.word === q.word) === i)
      .map((q) => ({
        word: q.word,
        translation: q.translation,
      }))

    questions.value = await buildQuestions(items)
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

  /** 当前题是否已「结算」可写入暂停批次（答对，或错/跳且不再重练） */
  function isQuestionSettled(question: QuizQuestion): boolean {
    if (!question.gradeResult) return false
    if (question.gradeResult.isCorrect) return true
    return question.retryCount >= maxRetries
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
    feedbackCorrectAnswer,

    initializeQuiz,
    submitCurrentAnswer,
    skipQuestion,
    acknowledgeFeedback,
    collectGradedResults,
    setResults,
    retryQuiz,
    getAnsweredQuestions,
    isQuestionSettled,
    setStatus,
    clearFeedback,
    buildQuestion,
  }
}
