<script setup lang="ts">
import { computed } from 'vue'
import type { AnswerFeedback, QuizQuestion } from '../types/quiz'
import WordCarousel from './WordCarousel.vue'
import WordContextSentences from './WordContextSentences.vue'

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
  (e: 'known'): void
  (e: 'acknowledge'): void
  /** 判错后认领自己的答案为正确 */
  (e: 'override-correct'): void
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
    : '输入中文释义回车确认，空回车表示不会',
)

const feedbackText = computed(() => {
  if (props.answerFeedback === 'correct') return '答对了'
  if (props.answerFeedback === 'wrong') {
    const skipped = !props.question.userAnswer.trim()
    return skipped ? '已跳过' : '再记一下'
  }
  return ''
})

/** 写了答案却被判错时，可认领近义/等价译法 */
const canOverrideCorrect = computed(
  () =>
    props.isAnswerLocked &&
    props.answerFeedback === 'wrong' &&
    Boolean(props.question.userAnswer.trim()),
)

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
    <div class="quiz-question-body">
      <div class="quiz-progress-chip">
        {{ progress }}
      </div>

      <WordCarousel
        :words="carouselWords"
        :current-index="currentIndex"
      />

      <div class="quiz-example-slot">
        <WordContextSentences
          :word="question.word"
          :gloss="question.translation"
          :definition-revealed="isAnswerLocked"
        />
      </div>

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
        <div class="quiz-feedback__actions">
          <button
            v-if="canOverrideCorrect"
            type="button"
            class="quiz-feedback__override"
            @click="emit('override-correct')"
          >
            算我对
          </button>
          <button
            type="button"
            class="quiz-feedback__continue"
            @click="emit('acknowledge')"
          >
            继续
          </button>
        </div>
      </div>
    </div>

    <div class="quiz-input-panel">
      <button
        v-if="!isAnswerLocked"
        type="button"
        class="quiz-known-btn"
        @click="emit('known')"
      >
        已会，跳过
      </button>

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
