<script setup lang="ts">
import { computed } from 'vue'

export interface CarouselWord {
  word: string
  phonetic?: string
  /** 中文释义提示，用稍小字号更易读 */
  isChinese?: boolean
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
      <div
        class="quiz-word-prompt__word"
        :class="{ 'is-chinese': current.isChinese }"
      >
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

.quiz-word-prompt__word {
  font-size: clamp(2.625rem, 11vw, 4.25rem);
  font-weight: 800;
  letter-spacing: -1.5px;
  color: #ffffff;
  line-height: 1.15;
  word-break: break-word;
}

.quiz-word-prompt__word.is-chinese {
  font-size: clamp(1.75rem, 7.5vw, 2.75rem);
  font-weight: 700;
  letter-spacing: 0.06em;
  line-height: 1.35;
}

.quiz-word-prompt__phonetic {
  margin-top: 10px;
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.5);
}
</style>
