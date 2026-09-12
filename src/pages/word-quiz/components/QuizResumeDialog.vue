<script setup lang="ts">
import { Clock } from 'lucide-vue-next'

defineProps<{
  isVisible: boolean
  remainingCount: number
}>()

const emit = defineEmits<{
  continue: []
  startNew: []
}>()
</script>

<template>
  <Transition name="quiz-resume-modal">
    <div v-if="isVisible" class="quiz-resume-overlay">
      <div class="quiz-resume-panel">
        <div class="quiz-resume-panel__icon">
          <Clock :size="22" />
        </div>
        <h2 class="quiz-resume-panel__title">未完成的测试</h2>
        <p class="quiz-resume-panel__desc">
          检测到剩余 <strong>{{ remainingCount }}</strong> 个单词尚未作答。
          是否继续上次的测试？
        </p>
        <div class="quiz-resume-panel__actions">
          <button
            type="button"
            class="quiz-resume-panel__button quiz-resume-panel__button--ghost"
            @click="emit('startNew')"
          >
            开始新测试
          </button>
          <button
            type="button"
            class="quiz-resume-panel__button quiz-resume-panel__button--solid"
            @click="emit('continue')"
          >
            继续测试
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.quiz-resume-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.quiz-resume-panel {
  background: #1c1c1e;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.55);
  max-width: 380px;
  width: 100%;
  padding: 32px 24px 24px;
  text-align: center;
  color: #ffffff;
}

.quiz-resume-panel__icon {
  width: 52px;
  height: 52px;
  margin: 0 auto 14px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
}

.quiz-resume-panel__title {
  margin: 0 0 10px;
  font-size: 20px;
  font-weight: 600;
}

.quiz-resume-panel__desc {
  margin: 0 0 24px;
  font-size: 14px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.55);
}

.quiz-resume-panel__desc strong {
  color: #ffffff;
  font-weight: 600;
}

.quiz-resume-panel__actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.quiz-resume-panel__button {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 48px;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.quiz-resume-panel__button--solid {
  background: rgba(255, 255, 255, 0.92);
  color: #1c1c1e;
  border: none;
}

.quiz-resume-panel__button--solid:hover {
  background: #ffffff;
}

.quiz-resume-panel__button--ghost {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.quiz-resume-panel__button--ghost:hover {
  background: rgba(255, 255, 255, 0.1);
}

.quiz-resume-modal-enter-active,
.quiz-resume-modal-leave-active {
  transition: opacity 0.25s ease;
}

.quiz-resume-modal-enter-active .quiz-resume-panel,
.quiz-resume-modal-leave-active .quiz-resume-panel {
  transition: transform 0.25s ease;
}

.quiz-resume-modal-enter-from,
.quiz-resume-modal-leave-to {
  opacity: 0;
}

.quiz-resume-modal-enter-from .quiz-resume-panel,
.quiz-resume-modal-leave-to .quiz-resume-panel {
  transform: scale(0.94) translateY(-12px);
}
</style>
