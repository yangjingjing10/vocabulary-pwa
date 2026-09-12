<script setup lang="ts">
import { computed } from 'vue'
import type { QuizQuestion } from '../types/quiz'
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
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'next'): void
  (e: 'skip'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const userAnswer = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
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

function handleKeyDown(event: KeyboardEvent) {
  if (event.key !== 'Enter') return
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
          :key="currentIndex"
          :value="userAnswer"
          type="text"
          class="quiz-input"
          :placeholder="placeholder"
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
