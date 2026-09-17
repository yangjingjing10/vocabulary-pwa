<script setup lang="ts">
import { computed } from 'vue'
import type { QuizPromptMode } from '../types/quiz'
import { highlightWordInText } from '../utils/highlightWord'

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

const mode = computed<QuizPromptMode>(() => current.value?.promptMode || 'word')

const promptHtml = computed(() => {
  const item = current.value
  if (!item) return ''
  const text = (item.promptText || item.word || '').trim()
  if (!text) return ''
  if (mode.value === 'word') return ''
  return highlightWordInText(text, item.word)
})

const modeLabel = computed(() => {
  if (mode.value === 'phrase') return '固定搭配'
  if (mode.value === 'example') return '例句'
  return ''
})
</script>

<template>
  <div class="quiz-word-prompt" aria-live="polite">
    <div
      v-if="current"
      :key="`${currentIndex}-${current.word}-${mode}`"
      class="quiz-word-prompt__inner"
      :class="`is-${mode}`"
    >
      <div v-if="modeLabel" class="quiz-word-prompt__badge">
        {{ modeLabel }}
      </div>

      <div
        v-if="mode === 'word'"
        class="quiz-word-prompt__word"
      >
        {{ current.word }}
      </div>

      <div
        v-else
        class="quiz-word-prompt__context"
        v-html="promptHtml"
      />

      <div v-if="current.phonetic && mode === 'word'" class="quiz-word-prompt__phonetic">
        {{ current.phonetic }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.quiz-word-prompt {
  flex: 1;
  width: 100%;
  min-height: 180px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: -12px;
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

.quiz-word-prompt__badge {
  margin-bottom: 14px;
  padding: 4px 10px;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
}

.quiz-word-prompt__word {
  font-size: clamp(2.625rem, 11vw, 4.25rem);
  font-weight: 800;
  letter-spacing: -1.5px;
  color: #ffffff;
  line-height: 1.15;
  word-break: break-word;
}

.quiz-word-prompt__context {
  font-size: clamp(1.25rem, 5.2vw, 1.75rem);
  font-weight: 600;
  letter-spacing: 0.01em;
  color: rgba(255, 255, 255, 0.72);
  line-height: 1.45;
  word-break: break-word;
}

.quiz-word-prompt__context :deep(mark) {
  color: #ffffff;
  font-weight: 800;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.16) 0%,
    rgba(255, 255, 255, 0.08) 100%
  );
  border-radius: 4px;
  padding: 0 3px;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
}

.quiz-word-prompt__phonetic {
  margin-top: 10px;
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.5);
}
</style>
