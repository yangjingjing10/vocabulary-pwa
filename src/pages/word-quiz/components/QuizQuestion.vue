<script setup lang="ts">
import { computed } from 'vue'
import type { AnswerFeedback, QuizQuestion } from '../types/quiz'
import { getQuestionPrompt } from '../utils/quizAnswerMatch'
import WordCarousel from './WordCarousel.vue'
import WordContextSentences from './WordContextSentences.vue'

interface Props {
  question: QuizQuestion
  questions: QuizQuestion[]
  progress: string
  totalQuestions: number
  currentIndex: number
  modelValue: string
  feedback?: AnswerFeedback
  locked?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'next'): void
  (e: 'skip'): void
  (e: 'clear-feedback'): void
}

const props = withDefaults(defineProps<Props>(), {
  feedback: null,
  locked: false,
})
const emit = defineEmits<Emits>()

const userAnswer = computed({
  get: () => props.modelValue,
  set: (value) => {
    if (props.locked) return
    emit('update:modelValue', value)
    if (props.feedback === 'wrong') {
      emit('clear-feedback')
    }
  },
})

const carouselWords = computed(() =>
  props.questions.map((q) => ({
    word: getQuestionPrompt(q),
    isChinese: q.direction === 'zh-to-en',
  })),
)

const placeholder = computed(() =>
  props.question.direction === 'zh-to-en'
    ? '输入英文单词回车确认，空回车跳过'
    : '输入中文释义回车确认，空回车跳过',
)

const inputClass = computed(() => ({
  'quiz-input': true,
  'is-correct': props.feedback === 'correct',
  'is-wrong': props.feedback === 'wrong',
}))

function handleKeyDown(event: KeyboardEvent) {
  if (event.key !== 'Enter' || props.locked) return
  event.preventDefault()

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

    <div class="quiz-example-slot">
      <WordContextSentences
        v-if="question.direction === 'en-to-zh'"
        :word="question.word"
        :max-initial-display="2"
      />
    </div>

    <div class="quiz-input-panel">
      <div class="quiz-input-wrapper">
        <input
          v-model="userAnswer"
          type="text"
          :class="inputClass"
          :placeholder="placeholder"
          :disabled="locked"
          autocomplete="off"
          @keydown="handleKeyDown"
        />
      </div>
    </div>
  </div>
</template>
