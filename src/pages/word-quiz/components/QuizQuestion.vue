<script setup lang="ts">
import { computed } from 'vue'
import type { AnswerFeedback, QuizQuestion } from '../types/quiz'
import WordCarousel from './WordCarousel.vue'

interface Props {
  question: QuizQuestion
  questions: QuizQuestion[]
  progress: string
  totalQuestions: number
  currentIndex: number
  modelValue: string
  answerFeedback: AnswerFeedback
  isAnswerLocked: boolean
  feedbackCorrectAnswer: string
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'next'): void
  (e: 'skip'): void
  (e: 'acknowledge'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const userAnswer = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const carouselWords = computed(() =>
  props.questions.map((q) => ({
    word: q.word,
    promptMode: q.promptMode,
    promptText: q.promptText,
  })),
)

const placeholder = computed(() =>
  props.isAnswerLocked
    ? '回车继续下一题'
    : '输入中文释义回车确认，空回车跳过',
)

const feedbackText = computed(() => {
  if (props.answerFeedback === 'correct') return '答对了'
  if (props.answerFeedback === 'wrong') {
    const skipped = !props.question.userAnswer.trim()
    return skipped ? '已跳过' : '再记一下'
  }
  return ''
})

function handleKeyDown(event: KeyboardEvent) {
  if (event.key !== 'Enter') return
  event.preventDefault()

  if (props.isAnswerLocked) {
    emit('acknowledge')
    return
  }

  if (userAnswer.value.trim()) {
    emit('next')
  } else {
    emit('skip')
  }
}
</script>

<template>
  <div class="quiz-question-container">
    <div class="quiz-progress-chip">
      {{ progress }}
    </div>

    <WordCarousel
      :words="carouselWords"
      :current-index="currentIndex"
    />

    <div
      v-if="isAnswerLocked"
      class="quiz-feedback"
      :class="answerFeedback === 'correct' ? 'is-correct' : 'is-wrong'"
      role="status"
    >
      <div class="quiz-feedback__title">{{ feedbackText }}</div>
      <div class="quiz-feedback__answer">
        {{ feedbackCorrectAnswer }}
      </div>
      <button
        type="button"
        class="quiz-feedback__continue"
        @click="emit('acknowledge')"
      >
        继续
      </button>
    </div>

    <div class="quiz-input-panel">
      <div class="quiz-input-wrapper">
        <input
          :key="currentIndex"
          :value="userAnswer"
          type="text"
          class="quiz-input"
          :class="{
            'is-correct': answerFeedback === 'correct',
            'is-wrong': answerFeedback === 'wrong',
          }"
          :placeholder="placeholder"
          :readonly="isAnswerLocked"
          autocomplete="off"
          enterkeyhint="done"
          autofocus
          @input="userAnswer = ($event.target as HTMLInputElement).value"
          @keydown="handleKeyDown"
        />
      </div>
    </div>
  </div>
</template>
