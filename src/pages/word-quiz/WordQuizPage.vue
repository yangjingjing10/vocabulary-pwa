<script setup lang="ts">
import { computed, onMounted, ref, toRef } from 'vue'
import { ArrowLeft, Loader2, Pause } from 'lucide-vue-next'

import { useQuizState } from './composables/useQuizState'
import { useQuizPause } from './composables/useQuizPause'
import QuizQuestion from './components/QuizQuestion.vue'
import QuizResults from './components/QuizResults.vue'
import QuizPausePanel from './components/QuizPausePanel.vue'
import QuizResumeDialog from './components/QuizResumeDialog.vue'
import type { QuizPauseResult } from './types/quizPause'
import type { QuizResult } from './types/quiz'
import type { QuizBatch, QuizWord } from './types/quizPause'
import { getCorrectAnswer } from './utils/quizAnswerMatch'
import {
  collectPendingWrongWords,
  getChoicePracticeState,
  getRemainingWrongWords,
  mergePendingWrongWords,
} from '@/db/repositories/choice-practice-state.repository'
import { settleYesterdayReviewWords } from '@/services/practice-mix.service'
import { settleReviewedWords } from '@/services/review-session.service'
import { shiftLocalDate } from '@/utils/localDate'

import '@/styles/pages/word-quiz-page.css'

interface Props {
  words: string[]
  date?: string
  /** 复习模式：答错回炉，答对搁置 */
  reviewMode?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  date: '',
  reviewMode: false,
})
const emit = defineEmits<{
  back: []
  advancedPractice: [words: string[], priorityWords: string[], date: string]
}>()

const {
  currentQuestion,
  progress,
  userAnswer,
  results,
  correctCount,
  skippedCount,
  accuracy,
  incorrectResults,
  skippedResults,
  currentQuestionIndex,
  questions,
  isCompleted,
  isTesting,
  isGrading,
  isLoading,
  isAnswerLocked,
  answerFeedback,
  feedbackCorrectAnswer,
  initializeQuiz,
  submitCurrentAnswer,
  skipQuestion,
  acknowledgeFeedback,
  collectGradedResults,
  collectMasteryResults,
  setResults,
  setStatus,
  isQuestionSettled,
  buildQuestion,
  markQuestionKnown,
  overrideAsCorrect,
} = useQuizState(props.words, { reviewMode: props.reviewMode })

const pauseNamespace = computed(() =>
  props.reviewMode ? ('review' as const) : ('practice' as const),
)

const {
  currentBatch,
  isPausing,
  createBatch,
  loadUnfinishedBatch,
  pauseAndCheck,
  syncQuestionProgress,
  markBatchPaused,
  getPendingWords,
  getCheckedWords,
  getWrongWords,
  clearBatch,
} = useQuizPause(toRef(props, 'date'), pauseNamespace)

const showPausePanel = ref(false)
const pauseResult = ref<QuizPauseResult | null>(null)
const showResumeDialog = ref(false)
const pendingBatch = ref<QuizBatch | null>(null)
const pendingRemaining = ref<QuizWord[]>([])
/** 查看暂停结果后仍有剩余题 */
const isPartialResults = ref(false)
const remainingAfterPause = ref(0)
const mixedReviewCount = ref(0)

const loadingHint = computed(() => {
  if (props.reviewMode) {
    if (mixedReviewCount.value > 0) {
      return `复习 · ${props.words.length} 词（含 ${mixedReviewCount.value} 个错题优先）`
    }
    return `复习 · 本轮 ${props.words.length} 词 · 对搁错留`
  }
  if (mixedReviewCount.value > 0) {
    return `看英文写意思 · 已混入昨日错题 ${mixedReviewCount.value} 个`
  }
  return '看英文语境，写出中文意思'
})

async function detectMixedReviewCount() {
  if (!props.date || props.words.length === 0) {
    mixedReviewCount.value = 0
    return
  }
  try {
    if (props.reviewMode) {
      const remaining = new Set(
        (await collectPendingWrongWords()).map((w) => w.trim().toLowerCase()),
      )
      mixedReviewCount.value = props.words.filter((w) =>
        remaining.has(w.trim().toLowerCase()),
      ).length
      return
    }
    const yesterday = shiftLocalDate(props.date, -1)
    const state = await getChoicePracticeState(yesterday)
    const remaining = new Set(
      getRemainingWrongWords(state).map((w) => w.trim().toLowerCase()),
    )
    mixedReviewCount.value = props.words.filter((w) =>
      remaining.has(w.trim().toLowerCase()),
    ).length
  } catch {
    mixedReviewCount.value = 0
  }
}

onMounted(async () => {
  void detectMixedReviewCount()

  const unfinishedBatch = loadUnfinishedBatch()

  if (unfinishedBatch) {
    const remainingWords = getPendingWords(unfinishedBatch)

    if (remainingWords.length > 0) {
      pendingBatch.value = unfinishedBatch
      pendingRemaining.value = remainingWords
      showResumeDialog.value = true
      // 保持 loading，等用户选「继续 / 新开」
      return
    }

    clearBatch()
  }

  await startFreshQuiz()
})

async function startFreshQuiz() {
  clearBatch()
  isPartialResults.value = false
  remainingAfterPause.value = 0
  await initializeQuiz()
  const seen = new Set<string>()
  const seeds = questions.value.filter((q) => {
    const key = q.word.trim().toLowerCase()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
  createBatch(
    seeds.map((q) => ({
      word: q.word,
      translation: q.translation,
      direction: q.direction,
    })),
  )
}

async function handleResumeContinue() {
  if (!pendingBatch.value) return
  showResumeDialog.value = false
  isPartialResults.value = false
  remainingAfterPause.value = 0
  await loadUnfinishedTest(pendingBatch.value, pendingRemaining.value)
  pendingBatch.value = null
  pendingRemaining.value = []
}

async function handleResumeStartNew() {
  showResumeDialog.value = false
  pendingBatch.value = null
  pendingRemaining.value = []
  clearBatch()
  // 复习放弃进度：回首页，下次点复习重新选词量
  if (props.reviewMode) {
    emit('back')
    return
  }
  await startFreshQuiz()
}

async function loadUnfinishedTest(batch: QuizBatch, remainingWords: QuizWord[]) {
  currentBatch.value = batch
  questions.value = await Promise.all(
    remainingWords.map((w) =>
      buildQuestion(w.word, w.translation || '', 0),
    ),
  )

  currentQuestionIndex.value = 0
  userAnswer.value = ''
  isPartialResults.value = false
  remainingAfterPause.value = 0
  setStatus('testing')
}

function persistQuestionByRef(
  question: {
    word: string
    translation: string
    direction: 'en-to-zh' | 'zh-to-en'
    userAnswer: string
    gradeResult?: { isCorrect: boolean; correctAnswer: string }
  },
  skipped: boolean,
) {
  if (!currentBatch.value || !question.gradeResult) return

  syncQuestionProgress(currentBatch.value, {
    word: question.word,
    translation: question.translation,
    direction: question.direction,
    userAnswer: skipped ? '' : question.userAnswer,
    skipped,
    gradeResult: question.gradeResult,
  })
}

async function persistSessionWrongs(batch: QuizBatch | null, extraWrongWords: string[] = []) {
  if (!props.date) return
  const fromBatch = batch ? getWrongWords(batch) : []
  const wrongs = [
    ...new Set(
      [...fromBatch, ...extraWrongWords]
        .map((w) => w.trim())
        .filter(Boolean),
    ),
  ]
  if (wrongs.length === 0) return
  try {
    await mergePendingWrongWords(props.date, wrongs)
  } catch (error) {
    console.error('Failed to save wrong words:', error)
  }
}

/** 暂停面板：按首次作答统计，避免「答错未结算」被漏掉导致虚报全对 */
function buildPauseDisplayResult(batch: QuizBatch): QuizPauseResult {
  const sessionResults = collectGradedResults()
  const checked = sessionResults.filter((r) => !r.skipped)
  const correctCount = checked.filter((r) => r.isCorrect).length

  return {
    batchId: batch.batchId,
    checkedCount: checked.length,
    correctCount,
    // 续测队列：未作答 + 答错尚未结算（仍留在 batch 待重练）
    remainingCount: getPendingWords(batch).length,
    results: checked.map((r) => ({
      id: `session-${r.word}`,
      word: r.word,
      translation: r.translation || '',
      direction: r.direction || 'en-to-zh',
      userAnswer: r.userAnswer,
      skipped: false,
      aiResult: {
        correct: r.isCorrect,
        correctAnswer: r.correctAnswer,
      },
    })),
  }
}

/** 结算错题池进度 */
async function settleReviewProgress(graded: QuizResult[]) {
  if (!props.date || graded.length === 0) return
  try {
    if (props.reviewMode) {
      await settleReviewedWords({
        practiceDate: props.date,
        correctWords: graded.filter((r) => r.isCorrect).map((r) => r.word),
        wrongWords: graded.filter((r) => !r.isCorrect).map((r) => r.word),
      })
      return
    }
    await settleYesterdayReviewWords(
      props.date,
      graded.map((r) => r.word),
    )
  } catch (error) {
    console.error('Failed to settle review words:', error)
  }
}

function batchWordToResult(word: QuizWord): QuizResult {
  const skipped = Boolean(word.skipped)
  return {
    word: word.word,
    userAnswer: skipped ? '' : word.userAnswer,
    correctAnswer:
      word.aiResult?.correctAnswer ||
      getCorrectAnswer({
        word: word.word,
        translation: word.translation || '',
        direction: word.direction || 'en-to-zh',
      }),
    translation: word.translation,
    isCorrect: skipped ? false : Boolean(word.aiResult?.correct),
    direction: word.direction,
    skipped,
  }
}

async function finishWithLocalResults() {
  // 先把本轮已结算题写入 batch（答对，或错/跳且不再重练）
  questions.value.forEach((q) => {
    if (!q.gradeResult || !currentBatch.value) return
    if (!isQuestionSettled(q)) return
    persistQuestionByRef(q, !q.userAnswer.trim())
  })

  const sessionResults = collectGradedResults()
  const masteryResults = collectMasteryResults()
  const sessionWords = new Set(
    sessionResults.map((r) => r.word.trim().toLowerCase()),
  )

  // 合并暂停前已完成的题，避免续测后结果页只剩后半段
  const earlierResults =
    currentBatch.value
      ? getCheckedWords(currentBatch.value)
          .filter((w) => !sessionWords.has(w.word.trim().toLowerCase()))
          .map(batchWordToResult)
      : []

  const displayResults = [...earlierResults, ...sessionResults]
  const masteryByWord = new Map(
    [...earlierResults, ...masteryResults].map((r) => [
      r.word.trim().toLowerCase(),
      r,
    ]),
  )
  const masteryMerged = [...masteryByWord.values()]

  setResults(displayResults)
  isPartialResults.value = false
  remainingAfterPause.value = 0
  const sessionWrongWords = sessionResults
    .filter((r) => !r.isCorrect)
    .map((r) => r.word)
  await persistSessionWrongs(currentBatch.value, sessionWrongWords)
  await settleReviewProgress(masteryMerged)
  clearBatch()
}

function handleNext() {
  submitCurrentAnswer()
}

function handleSkip() {
  skipQuestion()
}

async function handleKnown() {
  const indexBefore = currentQuestionIndex.value
  const question = questions.value[indexBefore]
  const outcome = await markQuestionKnown()

  if (outcome === 'rejected') return

  if (question?.gradeResult && isQuestionSettled(question)) {
    persistQuestionByRef(question, false)
  }

  if (outcome === 'finished') {
    await finishWithLocalResults()
  }
}

function handleOverrideCorrect() {
  overrideAsCorrect()
}

async function handleAcknowledge() {
  const indexBefore = currentQuestionIndex.value
  const question = questions.value[indexBefore]
  const outcome = await acknowledgeFeedback()

  if (outcome === 'rejected') return

  // 仅结算后的题写入暂停批次，避免错题重练时被当成已完成
  if (question?.gradeResult && isQuestionSettled(question)) {
    persistQuestionByRef(question, !question.userAnswer.trim())
  }

  if (outcome === 'finished') {
    await finishWithLocalResults()
  }
}

async function handlePause() {
  // 确保有 batch，并把当前页面上已处理的题都同步进去
  if (!currentBatch.value) {
    const seen = new Set<string>()
    const seeds = questions.value.filter((q) => {
      const key = q.word.trim().toLowerCase()
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
    createBatch(
      seeds.map((q) => ({
        word: q.word,
        translation: q.translation,
        direction: q.direction,
      })),
    )
  }

  const batch = currentBatch.value!
  questions.value.forEach((q) => {
    if (!isQuestionSettled(q) || !currentBatch.value) return
    const skipped = !q.userAnswer.trim()
    syncQuestionProgress(batch, {
      word: q.word,
      translation: q.translation,
      direction: q.direction,
      userAnswer: skipped ? '' : q.userAnswer,
      skipped,
      gradeResult: q.gradeResult,
    })
  })

  // 当前输入框里未提交的内容也暂存，避免丢进度
  const current = questions.value[currentQuestionIndex.value]
  if (current && !current.gradeResult && userAnswer.value.trim()) {
    syncQuestionProgress(batch, {
      word: current.word,
      translation: current.translation,
      direction: current.direction,
      userAnswer: userAnswer.value.trim(),
      skipped: false,
    })
  }

  try {
    setStatus('grading')
    // 仍落盘已结算题，供续测；面板数字改用首次作答，避免漏计未结算错题
    await pauseAndCheck(batch)
    const display = buildPauseDisplayResult(batch)
    pauseResult.value = display
    const sessionWrongWords = collectGradedResults()
      .filter((r) => !r.isCorrect)
      .map((r) => r.word)
    await persistSessionWrongs(batch, sessionWrongWords)
    await settleReviewProgress(collectMasteryResults())
    showPausePanel.value = true
    setStatus('testing')
  } catch (error) {
    console.error('Pause failed:', error)
    alert('暂停失败，请重试')
    setStatus('testing')
  }
}

async function handleViewPauseResults() {
  showPausePanel.value = false

  if (!pauseResult.value || !currentBatch.value) {
    return
  }

  const batch = currentBatch.value
  const remainingWords = getPendingWords(batch)

  // 优先用会话内「首次作答」结果，再补上本轮会话之外、批次里已结算的题
  const sessionResults = collectGradedResults()
  const sessionKeys = new Set(
    sessionResults.map((r) => r.word.trim().toLowerCase()),
  )
  const earlierResults = getCheckedWords(batch)
    .filter((w) => !sessionKeys.has(w.word.trim().toLowerCase()))
    .map(batchWordToResult)
  const quizResults = [...earlierResults, ...sessionResults]

  setResults(quizResults)
  const sessionWrongWords = sessionResults
    .filter((r) => !r.isCorrect)
    .map((r) => r.word)
  await persistSessionWrongs(batch, sessionWrongWords)
  const masteryByWord = new Map(
    [...earlierResults, ...collectMasteryResults()].map((r) => [
      r.word.trim().toLowerCase(),
      r,
    ]),
  )
  await settleReviewProgress([...masteryByWord.values()])

  // 还有剩余题：保留批次，下次/本页可续测；不要 clearBatch
  if (remainingWords.length > 0) {
    isPartialResults.value = true
    remainingAfterPause.value = remainingWords.length
    markBatchPaused(batch)
  } else {
    isPartialResults.value = false
    remainingAfterPause.value = 0
    clearBatch()
  }
}

async function handleContinueTest() {
  showPausePanel.value = false

  if (!currentBatch.value) return

  const remainingWords = getPendingWords(currentBatch.value)

  if (remainingWords.length === 0) {
    await handleViewPauseResults()
    return
  }

  await loadUnfinishedTest(currentBatch.value, remainingWords)
}

async function handleContinueFromResults() {
  const batch = currentBatch.value || loadUnfinishedBatch()
  if (!batch) return

  const remainingWords = getPendingWords(batch)
  if (remainingWords.length === 0) {
    isPartialResults.value = false
    remainingAfterPause.value = 0
    return
  }

  await loadUnfinishedTest(batch, remainingWords)
}

function handleClosePausePanel() {
  // 关闭弹窗视为确认暂停，进度已保存
  if (currentBatch.value) {
    markBatchPaused(currentBatch.value)
  }
  showPausePanel.value = false
}

async function handleRetry() {
  await startFreshQuiz()
}

function handleGoToAdvancedPractice() {
  const wrongWords = [
    ...incorrectResults.value.map((r) => r.word),
    ...skippedResults.value.map((r) => r.word),
  ]
  emit('advancedPractice', props.words, wrongWords, props.date)
}

function handleBack() {
  // 返回前把已做进度落盘，下次可续测
  // 阶段结果页也要保留批次（isPartialResults）
  if (currentBatch.value && (!isCompleted.value || isPartialResults.value)) {
    if (!isCompleted.value) {
      questions.value.forEach((q) => {
        if (!isQuestionSettled(q) || !currentBatch.value) return
        const skipped = !q.userAnswer.trim()
        syncQuestionProgress(currentBatch.value, {
          word: q.word,
          translation: q.translation,
          direction: q.direction,
          userAnswer: skipped ? '' : q.userAnswer,
          skipped,
          gradeResult: q.gradeResult,
        })
      })
    }
    markBatchPaused(currentBatch.value)
  }
  emit('back')
}

const resultsTitle = computed(() =>
  isPartialResults.value ? '阶段检测结果' : '测试完成',
)
</script>

<template>
  <div class="word-quiz-page">
    <header class="quiz-header">
      <button class="quiz-back-btn" type="button" aria-label="返回" @click="handleBack">
        <ArrowLeft :size="20" :stroke-width="2.5" />
      </button>
      <button
        v-if="isTesting"
        class="quiz-pause-btn"
        type="button"
        :disabled="isPausing || isAnswerLocked"
        :aria-label="isPausing ? '暂停中' : '暂停测试'"
        title="暂停测试（只检测已答单词）"
        @click="handlePause"
      >
        <Loader2 v-if="isPausing" class="is-spinning" :size="18" />
        <Pause v-else :size="18" />
      </button>
      <div v-else class="quiz-header__spacer" />
    </header>

    <main class="quiz-content">
      <div v-if="isLoading && !showResumeDialog" class="quiz-loading">
        <Loader2 class="is-spinning" :size="48" />
        <p>正在准备题目...</p>
        <p class="quiz-loading__hint">{{ loadingHint }}</p>
      </div>

      <QuizQuestion
        v-else-if="isTesting && currentQuestion"
        v-model="userAnswer"
        :question="currentQuestion"
        :questions="questions"
        :progress="progress"
        :total-questions="questions.length"
        :current-index="currentQuestionIndex"
        :answer-feedback="answerFeedback"
        :is-answer-locked="isAnswerLocked"
        :feedback-correct-answer="feedbackCorrectAnswer"
        @next="handleNext"
        @skip="handleSkip"
        @known="handleKnown"
        @override-correct="handleOverrideCorrect"
        @acknowledge="handleAcknowledge"
      />

      <div v-else-if="isGrading" class="quiz-loading">
        <Loader2 class="is-spinning" :size="48" />
        <p>{{ isPausing ? '正在检测已答单词...' : '正在汇总结果...' }}</p>
        <p class="quiz-loading__hint">
          {{ isPausing ? '未答单词将被保留' : '本地词典判题' }}
        </p>
      </div>

      <QuizResults
        v-else-if="isCompleted"
        :title="resultsTitle"
        :is-partial="isPartialResults"
        :remaining-count="remainingAfterPause"
        :results="results"
        :accuracy="accuracy"
        :correct-count="correctCount"
        :skipped-count="skippedCount"
        :incorrect-results="incorrectResults"
        :skipped-results="skippedResults"
        @retry="handleRetry"
        @continue-remaining="handleContinueFromResults"
        @advancedPractice="handleGoToAdvancedPractice"
        @back="handleBack"
      />
    </main>

    <QuizPausePanel
      :is-visible="showPausePanel"
      :pause-result="pauseResult"
      @continue="handleContinueTest"
      @view-results="handleViewPauseResults"
      @close="handleClosePausePanel"
    />

    <QuizResumeDialog
      :is-visible="showResumeDialog"
      :remaining-count="pendingRemaining.length"
      :review-mode="reviewMode"
      @continue="handleResumeContinue"
      @start-new="handleResumeStartNew"
    />
  </div>
</template>
