<script setup lang="ts">
import { computed } from 'vue'
import type { QuizPromptMode } from '../types/quiz'

export interface CarouselWord {
  word: string
  promptMode?: QuizPromptMode
  promptText?: string
  phonetic?: string
}

const props = defineProps<{
  words: CarouselWord[]
  currentIndex: number
}>()

const current = computed(() => props.words[props.currentIndex] ?? null)
</script>

<template>
  <div class="quiz-word-prompt" aria-live="polite">
    <div
      v-if="current"
      :key="`${currentIndex}-${current.word}`"
      class="quiz-word-prompt__inner"
    >
      <div class="quiz-word-prompt__word">
        {{ current.word }}
      </div>

      <div v-if="current.phonetic" class="quiz-word-prompt__phonetic">
        {{ current.phonetic }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.quiz-word-prompt {
  flex: 0 0 auto;
  width: 100%;
  min-height: 100px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: -8px;
  overflow: hidden;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.quiz-word-prompt__inner {
  width: min(92%, 520px);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 0 12px;
}

.quiz-word-prompt__word {
  font-size: clamp(2.625rem, 11vw, 4.25rem);
  font-weight: 800;
  letter-spacing: -1.5px;
  color: #ffffff;
  line-height: 1.15;
  word-break: break-word;
}

.quiz-word-prompt__phonetic {
  margin-top: 10px;
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.5);
}
</style>
