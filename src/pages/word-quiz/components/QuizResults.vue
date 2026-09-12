<script setup lang="ts">
import type { QuizResult } from '../types/quiz'

interface Props {
  results: QuizResult[]
  accuracy: number
  correctCount: number
  incorrectResults: QuizResult[]
}

interface Emits {
  (e: 'retry'): void
  (e: 'advancedPractice'): void
  (e: 'back'): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()
</script>

<template>
  <div class="quiz-results">
    <div class="quiz-results__header">
      <h2>测试完成</h2>
      <div class="quiz-results__score">
        <div class="quiz-results__score-circle">
          <span class="quiz-results__score-number">{{ accuracy }}%</span>
        </div>
      </div>
    </div>

    <div class="quiz-results__stats">
      <div class="quiz-results__stat">
        <span class="quiz-results__stat-label">总题数</span>
        <span class="quiz-results__stat-value">{{ results.length }}</span>
      </div>
      <div class="quiz-results__stat">
        <span class="quiz-results__stat-label">正确</span>
        <span class="quiz-results__stat-value">{{ correctCount }}</span>
      </div>
      <div class="quiz-results__stat">
        <span class="quiz-results__stat-label">错误</span>
        <span class="quiz-results__stat-value">{{ results.length - correctCount }}</span>
      </div>
    </div>

    <div v-if="incorrectResults.length > 0" class="quiz-results__errors">
      <h3>错题回顾</h3>
      <div class="quiz-results__error-list">
        <div
          v-for="(result, idx) in incorrectResults"
          :key="idx"
          class="quiz-results__error-item"
        >
          <div class="quiz-results__error-question">{{ result.word }}</div>
          <div class="quiz-results__error-answers">
            <div class="quiz-results__error-answer quiz-results__error-answer--wrong">
              你的答案：{{ result.userAnswer }}
            </div>
            <div class="quiz-results__error-answer quiz-results__error-answer--correct">
              正确答案：{{ result.correctAnswer }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="quiz-results__actions">
      <button
        type="button"
        class="quiz-results__button quiz-results__button--solid"
        @click="emit('retry')"
      >
        再测一次
      </button>
      <button
        type="button"
        class="quiz-results__button quiz-results__button--ghost"
        @click="emit('advancedPractice')"
      >
        进阶练习
      </button>
      <button
        type="button"
        class="quiz-results__button quiz-results__button--ghost"
        @click="emit('back')"
      >
        返回单词本
      </button>
    </div>
  </div>
</template>
