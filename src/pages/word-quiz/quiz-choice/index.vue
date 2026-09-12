<script setup lang="ts">
import { ref, computed, toRef, onMounted } from 'vue'
import { ArrowLeft, Loader2, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { useChoiceQuiz } from './composables/useChoiceQuiz'
import ChoiceProgress from './components/ChoiceProgress.vue'
import ChoiceQuestion from './components/ChoiceQuestion.vue'
import ChoiceResult from './components/ChoiceResult.vue'

import '@/styles/pages/word-choice-quiz-page.css'

interface Props {
  words: string[]
  /** 优先出题的单词（如刚测错的词） */
  priorityWords?: string[]
  /** 所属日期，用于保存学习记录与错题进度 */
  date?: string
  /** 错题不足 10 时是否用其余词补全（进阶首批 true，续练 false） */
  fillFromPool?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  priorityWords: () => [],
  date: '',
  fillFromPool: true,
})

const emit = defineEmits<{
  back: []
}>()

const {
  questions,
  currentIndex,
  currentQuestion,
  userAnswers,
  isCompleted,
  isGenerating,
  isSaving,
  result,
  hasAnswer,
  generateQuestions,
  selectAnswer,
  nextQuestion,
  previousQuestion,
  submitQuiz,
  resetQuiz,
} = useChoiceQuiz(
  toRef(props, 'words'),
  toRef(props, 'priorityWords'),
  toRef(props, 'date'),
  toRef(props, 'fillFromPool'),
)

const errorMessage = ref('')
const showConfigHint = ref(false)

const answeredCount = computed(() => userAnswers.value.size)
const canGoPrevious = computed(() => currentIndex.value > 0)
const canGoNext = computed(() => currentIndex.value < questions.value.length - 1)
const isLastQuestion = computed(() => currentIndex.value === questions.value.length - 1)

onMounted(async () => {
  await initializeQuiz()
})

async function initializeQuiz() {
  try {
    errorMessage.value = ''
    showConfigHint.value = false
    await generateQuestions()
  } catch (error: any) {
    console.error('初始化失败:', error)
    errorMessage.value = error.message || '生成选择题失败'

    if (error.message && error.message.includes('未配置选择题生成提示词')) {
      showConfigHint.value = true
    }
  }
}

function handleSelectAnswer(answer: string) {
  if (!currentQuestion.value) return
  selectAnswer(currentQuestion.value.id, answer)
}

function handlePrevious() {
  previousQuestion()
}

function handleNext() {
  if (canGoNext.value) {
    nextQuestion()
  } else if (isLastQuestion.value) {
    handleSubmit()
  }
}

async function handleSubmit() {
  if (answeredCount.value === 0) {
    alert('请至少回答一道题')
    return
  }

  const unanswered = questions.value.length - answeredCount.value
  if (unanswered > 0) {
    const confirmed = confirm(`还有 ${unanswered} 道题未作答，确定提交吗？`)
    if (!confirmed) return
  }

  await submitQuiz()
}

async function handleRetry() {
  resetQuiz()
  await initializeQuiz()
}

function handleBack() {
  emit('back')
}
</script>

<template>
  <div class="choice-quiz-page">
    <header class="choice-header">
      <button class="choice-icon-button" type="button" aria-label="返回" @click="handleBack">
        <ArrowLeft :size="18" :stroke-width="2.5" />
      </button>
      <h1 class="choice-title">选择题练习</h1>
      <div class="choice-header__spacer" />
    </header>

    <main class="choice-content">
      <div v-if="isGenerating" class="choice-loading">
        <Loader2 class="is-spinning" :size="40" />
        <p>正在生成选择题...</p>
        <p class="choice-loading__hint">优先未练错题 · 每批最多 10 题（分次生成更稳）</p>
      </div>

      <div v-else-if="errorMessage" class="choice-error">
        <div class="choice-error__content">
          <h2 class="choice-error__title">无法生成选择题</h2>
          <p class="choice-error__message">{{ errorMessage }}</p>

          <div v-if="showConfigHint" class="choice-error__hint">
            <p>请先完成以下步骤：</p>
            <ol>
              <li>前往「设置」页面</li>
              <li>进入「提示词配置」</li>
              <li>选择「选择题配置」</li>
              <li>添加或激活一个选择题生成提示词</li>
            </ol>
          </div>

          <button
            v-else
            class="choice-error__button"
            type="button"
            @click="initializeQuiz"
          >
            重试
          </button>
        </div>
      </div>

      <div v-else-if="!isCompleted && currentQuestion" class="choice-quiz">
        <ChoiceProgress
          :current="currentIndex + 1"
          :total="questions.length"
          :answered-count="answeredCount"
        />

        <div class="choice-quiz__body">
          <ChoiceQuestion
            :question="currentQuestion"
            :selected-answer="userAnswers.get(currentQuestion.id)"
            @select="handleSelectAnswer"
          />
        </div>

        <div class="choice-quiz__navigation">
          <button
            class="choice-nav-button choice-nav-button--secondary"
            type="button"
            :disabled="!canGoPrevious"
            @click="handlePrevious"
          >
            <ChevronLeft :size="18" />
            <span>上一题</span>
          </button>

          <button
            v-if="!isLastQuestion"
            class="choice-nav-button choice-nav-button--primary"
            type="button"
            :disabled="!hasAnswer"
            @click="handleNext"
          >
            <span>下一题</span>
            <ChevronRight :size="18" />
          </button>

          <button
            v-else
            class="choice-nav-button choice-nav-button--submit"
            type="button"
            :disabled="isSaving"
            @click="handleSubmit"
          >
            <span>{{ isSaving ? '保存中...' : '提交答案' }}</span>
          </button>
        </div>
      </div>

      <ChoiceResult
        v-else-if="isCompleted && result"
        :result="result"
        @retry="handleRetry"
        @back="handleBack"
      />
    </main>
  </div>
</template>
