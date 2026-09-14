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
import { mergePendingWrongWords } from '@/db/repositories/choice-practice-state.repository'

import '@/styles/pages/word-quiz-page.css'

interface Props {
  words: string[]
  date?: string
}

const props = withDefaults(defineProps<Props>(), {
  date: '',
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
  initializeQuiz,
  submitCurrentAnswer,
  skipQuestion,
  collectGradedResults,
  setResults,
  setStatus,
} = useQuizState(props.words)

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
} = useQuizPause(toRef(props, 'date'))

const showPausePanel = ref(false)
const pauseResult = ref<QuizPauseResult | null>(null)
const showResumeDialog = ref(false)
const pendingBatch = ref<QuizBatch | null>(null)
const pendingRemaining = ref<QuizWord[]>([])
/** 查看暂停结果后仍有剩余题 */
const isPartialResults = ref(false)
const remainingAfterPause = ref(0)

onMounted(async () => {
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
  createBatch(
    questions.value.map((q) => ({
      word: q.word,
      translation: q.translation,
      direction: q.direction,
    })),
  )
}

function handleResumeContinue() {
  if (!pendingBatch.value) return
  showResumeDialog.value = false
  isPartialResults.value = false
  remainingAfterPause.value = 0
  loadUnfinishedTest(pendingBatch.value, pendingRemaining.value)
  pendingBatch.value = null
  pendingRemaining.value = []
}

async function handleResumeStartNew() {
  showResumeDialog.value = false
  pendingBatch.value = null
  pendingRemaining.value = []
  await startFreshQuiz()
}

function loadUnfinishedTest(batch: QuizBatch, remainingWords: QuizWord[]) {
  currentBatch.value = batch
  questions.value = remainingWords.map((w) => ({
    word: w.word,
    translation: w.translation || '',
    direction: w.direction || 'en-to-zh',
    userAnswer: '',
  }))

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

async function persistSessionWrongs(batch: QuizBatch | null) {
  if (!batch || !props.date) return
  const wrongs = getWrongWords(batch)
  if (wrongs.length === 0) return
  try {
    await mergePendingWrongWords(props.date, wrongs)
  } catch (error) {
    console.error('Failed to save wrong words:', error)
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
  // 先把本轮最后几题写入 batch
  questions.value.forEach((q) => {
    if (!q.gradeResult || !currentBatch.value) return
    persistQuestionByRef(q, !q.userAnswer.trim())
  })

  const sessionResults = collectGradedResults()
  const sessionWords = new Set(sessionResults.map((r) => r.word))

  // 合并暂停前已完成的题，避免续测后结果页只剩后半段
  const earlierResults =
    currentBatch.value
      ? getCheckedWords(currentBatch.value)
          .filter((w) => !sessionWords.has(w.word))
          .map(batchWordToResult)
      : []

  setResults([...earlierResults, ...sessionResults])
  isPartialResults.value = false
  remainingAfterPause.value = 0
  await persistSessionWrongs(currentBatch.value)
  clearBatch()
}

function handleNext() {
  const indexBefore = currentQuestionIndex.value
  const question = questions.value[indexBefore]
  const outcome = submitCurrentAnswer()

  if (outcome === 'rejected' || outcome === 'skipped-empty') return

  if (question?.gradeResult) {
    persistQuestionByRef(question, false)
  }

  if (outcome === 'finished') {
    void finishWithLocalResults()
  }
}

function handleSkip() {
  const indexBefore = currentQuestionIndex.value
  const question = questions.value[indexBefore]
  const outcome = skipQuestion()

  if (outcome === 'rejected') return

  if (question?.gradeResult) {
    persistQuestionByRef(question, true)
  }

  if (outcome === 'finished') {
    void finishWithLocalResults()
  }
}

async function handlePause() {
  // 确保有 batch，并把当前页面上已处理的题都同步进去
  if (!currentBatch.value) {
    createBatch(
      questions.value.map((q) => ({
        word: q.word,
        translation: q.translation,
        direction: q.direction,
      })),
    )
  }

  const batch = currentBatch.value!
  questions.value.forEach((q) => {
    if (!q.gradeResult) return
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
    const result = await pauseAndCheck(batch)
    pauseResult.value = result
    await persistSessionWrongs(batch)
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
  const checkedWords = getCheckedWords(batch)
  const quizResults: QuizResult[] = checkedWords.map((word) => ({
    word: word.word,
    userAnswer: word.skipped ? '' : word.userAnswer,
    correctAnswer: word.aiResult?.correctAnswer || getCorrectAnswer({
      word: word.word,
      translation: word.translation || '',
      direction: word.direction || 'en-to-zh',
    }),
    translation: word.translation,
    isCorrect: word.skipped ? false : Boolean(word.aiResult?.correct),
    direction: word.direction,
    skipped: Boolean(word.skipped),
  }))

  setResults(quizResults)
  await persistSessionWrongs(batch)

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

function handleContinueTest() {
  showPausePanel.value = false

  if (!currentBatch.value) return

  const remainingWords = getPendingWords(currentBatch.value)

  if (remainingWords.length === 0) {
    void handleViewPauseResults()
    return
  }

  loadUnfinishedTest(currentBatch.value, remainingWords)
}

function handleContinueFromResults() {
  const batch = currentBatch.value || loadUnfinishedBatch()
  if (!batch) return

  const remainingWords = getPendingWords(batch)
  if (remainingWords.length === 0) {
    isPartialResults.value = false
    remainingAfterPause.value = 0
    return
  }

  loadUnfinishedTest(batch, remainingWords)
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
        if (!q.gradeResult || !currentBatch.value) return
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
        <p class="quiz-loading__hint">英译中 / 中译英 五五开</p>
      </div>

      <QuizQuestion
        v-else-if="isTesting && currentQuestion"
        v-model="userAnswer"
        :question="currentQuestion"
        :questions="questions"
        :progress="progress"
        :total-questions="questions.length"
        :current-index="currentQuestionIndex"
        @next="handleNext"
        @skip="handleSkip"
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
      @continue="handleResumeContinue"
      @start-new="handleResumeStartNew"
    />
  </div>
</template>
