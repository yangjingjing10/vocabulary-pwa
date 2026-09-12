<script setup lang="ts">
import { onMounted, ref } from 'vue'
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
  accuracy,
  incorrectResults,
  currentQuestionIndex,
  questions,
  isCompleted,
  isTesting,
  isGrading,
  isLoading,
  answerFeedback,
  isAnswerLocked,
  initializeQuiz,
  submitCurrentAnswer,
  skipQuestion,
  collectGradedResults,
  setResults,
  retryQuiz,
  setStatus,
  clearFeedback,
} = useQuizState(props.words)

const {
  currentBatch,
  isPausing,
  createBatch,
  loadUnfinishedBatch,
  pauseAndCheck,
  updateWordAnswer,
  getUnansweredWords,
  getCheckedWords,
  clearBatch,
} = useQuizPause()

const showPausePanel = ref(false)
const pauseResult = ref<QuizPauseResult | null>(null)
const showResumeDialog = ref(false)
const pendingBatch = ref<QuizBatch | null>(null)
const pendingRemaining = ref<QuizWord[]>([])

onMounted(async () => {
  const unfinishedBatch = loadUnfinishedBatch()

  if (unfinishedBatch) {
    const remainingWords = getUnansweredWords(unfinishedBatch)

    if (remainingWords.length > 0) {
      pendingBatch.value = unfinishedBatch
      pendingRemaining.value = remainingWords
      showResumeDialog.value = true
      return
    }

    clearBatch()
  }

  await initializeQuiz()
})

function handleResumeContinue() {
  if (!pendingBatch.value) return
  showResumeDialog.value = false
  loadUnfinishedTest(pendingBatch.value, pendingRemaining.value)
  pendingBatch.value = null
  pendingRemaining.value = []
}

async function handleResumeStartNew() {
  showResumeDialog.value = false
  clearBatch()
  pendingBatch.value = null
  pendingRemaining.value = []
  await initializeQuiz()
}

function loadUnfinishedTest(batch: QuizBatch, remainingWords: QuizWord[]) {
  currentBatch.value = batch
  questions.value = remainingWords.map((w) => ({
    word: w.word,
    translation: w.translation || '',
    direction: w.direction || 'en-to-zh',
    userAnswer: w.userAnswer || '',
  }))

  currentQuestionIndex.value = 0
  userAnswer.value = ''
  answerFeedback.value = null
  setStatus('testing')
}

function finishWithLocalResults() {
  setResults(collectGradedResults())
  clearBatch()
}

async function handleNext() {
  const outcome = await submitCurrentAnswer()

  if (outcome === 'finished') {
    finishWithLocalResults()
  }
}

function handleSkip() {
  const hasNext = skipQuestion()

  if (!hasNext) {
    finishWithLocalResults()
  }
}

async function handlePause() {
  if (!currentBatch.value) {
    const batch = createBatch(
      questions.value.map((q) => ({
        word: q.word,
        translation: q.translation,
        direction: q.direction,
      })),
    )

    questions.value.forEach((q, index) => {
      const wordId = batch.words[index].id
      // 已正确确认的题写入答案；当前正在改的错题也按当前输入同步
      if (q.userAnswer.trim()) {
        updateWordAnswer(batch, wordId, q.userAnswer)
      }
    })
  } else {
    questions.value.forEach((q) => {
      if (!currentBatch.value) return
      const target = currentBatch.value.words.find((w) => w.word === q.word)
      if (!target) return
      target.translation = q.translation
      target.direction = q.direction
      if (q.userAnswer.trim()) {
        updateWordAnswer(currentBatch.value, target.id, q.userAnswer)
      }
    })
  }

  try {
    setStatus('grading')
    const result = await pauseAndCheck(currentBatch.value!)
    pauseResult.value = result
    showPausePanel.value = true
    setStatus('testing')
  } catch (error) {
    console.error('Pause failed:', error)
    alert('暂停失败，请重试')
    setStatus('testing')
  }
}

function handleViewPauseResults() {
  showPausePanel.value = false

  if (!pauseResult.value || !currentBatch.value) {
    return
  }

  const checkedWords = getCheckedWords(currentBatch.value)
  const quizResults: QuizResult[] = checkedWords.map((word) => ({
    word: word.word,
    userAnswer: word.userAnswer,
    correctAnswer: word.aiResult?.correctAnswer || getCorrectAnswer({
      word: word.word,
      translation: word.translation || '',
      direction: word.direction || 'en-to-zh',
    }),
    isCorrect: word.aiResult?.correct || false,
    direction: word.direction,
  }))

  setResults(quizResults)
}

function handleContinueTest() {
  showPausePanel.value = false

  if (!currentBatch.value) {
    return
  }

  const remainingWords = getUnansweredWords(currentBatch.value)

  if (remainingWords.length === 0) {
    alert('没有剩余单词了！')
    return
  }

  loadUnfinishedTest(currentBatch.value, remainingWords)
}

function handleClosePausePanel() {
  showPausePanel.value = false
}

async function handleRetry() {
  clearBatch()
  await retryQuiz()
}

function handleGoToAdvancedPractice() {
  const wrongWords = incorrectResults.value.map((r) => r.word)
  emit('advancedPractice', props.words, wrongWords, props.date)
}

function handleBack() {
  emit('back')
}
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
        title="暂停测试（只检测已答单词）"
        @click="handlePause"
      >
        <Pause :size="16" />
        <span>{{ isPausing ? '暂停中...' : '暂停' }}</span>
      </button>
      <div v-else class="quiz-header__spacer" />
    </header>

    <main class="quiz-content">
      <div v-if="isLoading" class="quiz-loading">
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
        :feedback="answerFeedback"
        :locked="isAnswerLocked"
        @next="handleNext"
        @skip="handleSkip"
        @clear-feedback="clearFeedback"
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
        :results="results"
        :accuracy="accuracy"
        :correct-count="correctCount"
        :incorrect-results="incorrectResults"
        @retry="handleRetry"
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
