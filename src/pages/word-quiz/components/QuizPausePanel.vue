<script setup lang="ts">
import { computed } from 'vue'
import { Pause, CheckCircle, XCircle, Clock, ArrowRight } from 'lucide-vue-next'
import type { QuizPauseResult } from '../types/quizPause'

interface Props {
  pauseResult?: QuizPauseResult | null
  isVisible: boolean
}

interface Emits {
  (e: 'continue'): void
  (e: 'viewResults'): void
  (e: 'close'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const accuracy = computed(() => {
  if (!props.pauseResult || props.pauseResult.checkedCount === 0) return 0
  return Math.round((props.pauseResult.correctCount / props.pauseResult.checkedCount) * 100)
})

const hasRemaining = computed(() => {
  return props.pauseResult && props.pauseResult.remainingCount > 0
})
</script>

<template>
  <Transition name="quiz-pause-modal">
    <div v-if="isVisible" class="quiz-pause-overlay" @click.self="emit('close')">
      <div class="quiz-pause-panel">
        <div class="quiz-pause-panel__header">
          <div class="quiz-pause-panel__icon">
            <Pause :size="22" />
          </div>
          <h2 class="quiz-pause-panel__title">测试已暂停</h2>
        </div>

        <div v-if="pauseResult" class="quiz-pause-panel__content">
          <div class="quiz-pause-panel__stats">
            <div class="quiz-pause-panel__stat-item">
              <span class="quiz-pause-panel__stat-label">本次检测</span>
              <span class="quiz-pause-panel__stat-value">{{ pauseResult.checkedCount }} 个</span>
            </div>
            <div class="quiz-pause-panel__stat-item">
              <CheckCircle :size="16" class="quiz-pause-panel__stat-icon quiz-pause-panel__stat-icon--ok" />
              <span class="quiz-pause-panel__stat-label">正确</span>
              <span class="quiz-pause-panel__stat-value quiz-pause-panel__stat-value--ok">
                {{ pauseResult.correctCount }} 个
              </span>
            </div>
            <div class="quiz-pause-panel__stat-item">
              <XCircle :size="16" class="quiz-pause-panel__stat-icon quiz-pause-panel__stat-icon--bad" />
              <span class="quiz-pause-panel__stat-label">错误</span>
              <span class="quiz-pause-panel__stat-value quiz-pause-panel__stat-value--bad">
                {{ pauseResult.checkedCount - pauseResult.correctCount }} 个
              </span>
            </div>
            <div class="quiz-pause-panel__stat-item">
              <span class="quiz-pause-panel__stat-label">准确率</span>
              <span class="quiz-pause-panel__stat-value">{{ accuracy }}%</span>
            </div>
          </div>

          <div v-if="hasRemaining" class="quiz-pause-panel__hint">
            <Clock :size="16" />
            <p>
              剩余 <strong>{{ pauseResult.remainingCount }}</strong> 个单词已为你保留，下次可继续测试
            </p>
          </div>

          <div v-else class="quiz-pause-panel__hint quiz-pause-panel__hint--done">
            <CheckCircle :size="16" />
            <p>所有单词已完成检测！</p>
          </div>
        </div>

        <div class="quiz-pause-panel__actions">
          <button
            v-if="hasRemaining"
            type="button"
            class="quiz-pause-panel__button quiz-pause-panel__button--ghost"
            @click="emit('continue')"
          >
            <ArrowRight :size="16" />
            继续测试剩余单词
          </button>
          <button
            type="button"
            class="quiz-pause-panel__button quiz-pause-panel__button--solid"
            @click="emit('viewResults')"
          >
            查看检测结果
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.quiz-pause-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.quiz-pause-panel {
  background: #1c1c1e;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.55);
  max-width: 420px;
  width: 100%;
  overflow: hidden;
  color: #ffffff;
}

.quiz-pause-panel__header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 24px 8px;
}

.quiz-pause-panel__icon {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  margin-bottom: 14px;
}

.quiz-pause-panel__title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #ffffff;
  letter-spacing: 0.02em;
}

.quiz-pause-panel__content {
  padding: 20px 24px 8px;
}

.quiz-pause-panel__stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 14px;
}

.quiz-pause-panel__stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.quiz-pause-panel__stat-icon--ok {
  color: #30d158;
}

.quiz-pause-panel__stat-icon--bad {
  color: #ff453a;
}

.quiz-pause-panel__stat-label {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.45);
}

.quiz-pause-panel__stat-value {
  font-size: 1.125rem;
  font-weight: 600;
  color: #ffffff;
}

.quiz-pause-panel__stat-value--ok {
  color: #30d158;
}

.quiz-pause-panel__stat-value--bad {
  color: #ff453a;
}

.quiz-pause-panel__hint {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  color: rgba(255, 255, 255, 0.55);
}

.quiz-pause-panel__hint--done {
  color: rgba(255, 255, 255, 0.7);
}

.quiz-pause-panel__hint p {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.5;
}

.quiz-pause-panel__hint strong {
  color: #ffffff;
  font-weight: 600;
}

.quiz-pause-panel__actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 24px 24px;
}

.quiz-pause-panel__button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 48px;
  border-radius: 14px;
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.quiz-pause-panel__button--solid {
  background: rgba(255, 255, 255, 0.92);
  color: #1c1c1e;
  border: none;
}

.quiz-pause-panel__button--solid:hover {
  background: #ffffff;
}

.quiz-pause-panel__button--ghost {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.quiz-pause-panel__button--ghost:hover {
  background: rgba(255, 255, 255, 0.1);
}

.quiz-pause-modal-enter-active,
.quiz-pause-modal-leave-active {
  transition: opacity 0.3s ease;
}

.quiz-pause-modal-enter-active .quiz-pause-panel,
.quiz-pause-modal-leave-active .quiz-pause-panel {
  transition: transform 0.3s ease;
}

.quiz-pause-modal-enter-from,
.quiz-pause-modal-leave-to {
  opacity: 0;
}

.quiz-pause-modal-enter-from .quiz-pause-panel,
.quiz-pause-modal-leave-to .quiz-pause-panel {
  transform: scale(0.94) translateY(-12px);
}
</style>
