<script setup lang="ts">
import { X, Trophy } from 'lucide-vue-next'
import { computed } from 'vue'

interface TranslationRecord {
  id: string
  date: string
  chineseText: string
  userTranslation: string
  score: number
  feedback: string
  referenceTranslations: string[]
  wordUsage: Record<string, {
    used: boolean
    correct: boolean
    suggestion: string
  }>
  relatedWords: string[]
  createdAt: number
}

const props = defineProps<{
  record: TranslationRecord | null
}>()

const emit = defineEmits<{
  close: []
}>()

const scoreColor = computed(() => {
  if (!props.record) return ''
  const score = props.record.score
  if (score >= 90) return 'gold'
  if (score >= 80) return 'blue'
  if (score >= 70) return 'green'
  return 'orange'
})

const scoreStars = computed(() => {
  if (!props.record) return ''
  const score = props.record.score
  if (score >= 90) return '⭐⭐⭐⭐⭐'
  if (score >= 80) return '⭐⭐⭐⭐'
  if (score >= 70) return '⭐⭐⭐'
  if (score >= 60) return '⭐⭐'
  return '⭐'
})
</script>

<template>
  <Transition name="modal">
    <div v-if="record" class="translation-modal-overlay" @click.self="emit('close')">
      <div class="translation-modal">
        <div class="translation-modal__header">
          <div class="translation-modal__header-content">
            <Trophy :size="24" />
            <div>
              <h3>Translation Record</h3>
              <p>{{ new Date(record.createdAt).toLocaleString() }}</p>
            </div>
          </div>
          <button type="button" class="translation-modal__close" @click="emit('close')">
            <X :size="20" />
          </button>
        </div>

        <div class="translation-modal__body">
          <!-- Score Section -->
          <div class="translation-modal__score" :class="`translation-modal__score--${scoreColor}`">
            <div class="translation-modal__score-circle">
              <span class="translation-modal__score-number">{{ record.score }}</span>
              <span class="translation-modal__score-total">/ 100</span>
            </div>
            <div class="translation-modal__score-stars">{{ scoreStars }}</div>
          </div>

          <!-- Feedback Section -->
          <div class="translation-modal__section">
            <h4>📝 AI Feedback</h4>
            <p>{{ record.feedback }}</p>
          </div>

          <!-- Word Usage Section -->
          <div v-if="Object.keys(record.wordUsage).length > 0" class="translation-modal__section">
            <h4>✅ Word Usage</h4>
            <div class="translation-modal__word-usage">
              <div 
                v-for="(detail, word) in record.wordUsage" 
                :key="word"
                class="translation-modal__word-item"
                :class="{
                  'translation-modal__word-item--correct': detail.correct,
                  'translation-modal__word-item--incorrect': !detail.correct
                }"
              >
                <span class="translation-modal__word-icon">
                  {{ detail.correct ? '✓' : '✗' }}
                </span>
                <span class="translation-modal__word-text">{{ word }}</span>
                <span v-if="detail.suggestion" class="translation-modal__word-suggestion">
                  {{ detail.suggestion }}
                </span>
              </div>
            </div>
          </div>

          <!-- Reference Translations -->
          <div v-if="record.referenceTranslations.length > 0" class="translation-modal__section">
            <h4>📖 Reference Translations</h4>
            <div 
              v-for="(translation, idx) in record.referenceTranslations" 
              :key="idx"
              class="translation-modal__reference"
            >
              <div class="translation-modal__reference-label">Reference {{ idx + 1 }}</div>
              <p>{{ translation }}</p>
            </div>
          </div>

          <!-- Original Text & User Translation -->
          <div class="translation-modal__section">
            <details open>
              <summary>View Original & Your Translation</summary>
              <div class="translation-modal__comparison">
                <div class="translation-modal__comparison-item">
                  <strong>Chinese Original:</strong>
                  <p>{{ record.chineseText }}</p>
                </div>
                <div class="translation-modal__comparison-item">
                  <strong>Your Translation:</strong>
                  <p>{{ record.userTranslation }}</p>
                </div>
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .translation-modal,
.modal-leave-active .translation-modal {
  transition: transform 0.3s;
}

.modal-enter-from .translation-modal,
.modal-leave-to .translation-modal {
  transform: scale(0.9);
}

.translation-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 1000;
  overflow-y: auto;
}

.translation-modal {
  background: white;
  border-radius: 16px;
  max-width: 700px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.translation-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
  position: sticky;
  top: 0;
  background: white;
  z-index: 10;
}

.translation-modal__header-content {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--app-font-color-muted, #475569);
}

.translation-modal__header-content h3 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
}

.translation-modal__header-content p {
  margin: 4px 0 0 0;
  font-size: 0.8125rem;
  color: #6b7280;
}

.translation-modal__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: #f3f4f6;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
}

.translation-modal__close:hover {
  background: #e5e7eb;
  color: #1f2937;
}

.translation-modal__body {
  padding: 24px;
}

.translation-modal__score {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px;
  margin-bottom: 20px;
  background: #f9fafb;
  border-radius: 12px;
}

.translation-modal__score-circle {
  display: flex;
  align-items: baseline;
  justify-content: center;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  margin-bottom: 12px;
}

.translation-modal__score--gold .translation-modal__score-circle {
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
}

.translation-modal__score--blue .translation-modal__score-circle {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
}

.translation-modal__score--green .translation-modal__score-circle {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.translation-modal__score--orange .translation-modal__score-circle {
  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
}

.translation-modal__score-number {
  font-size: 2.625rem;
  font-weight: 700;
  color: white;
  line-height: 1;
}

.translation-modal__score-total {
  font-size: 1.125rem;
  color: rgba(255, 255, 255, 0.9);
  margin-left: 2px;
}

.translation-modal__score-stars {
  font-size: 1.25rem;
}

.translation-modal__section {
  margin-bottom: 20px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 10px;
}

.translation-modal__section h4 {
  margin: 0 0 12px 0;
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
}

.translation-modal__section p {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.6;
  color: #374151;
}

.translation-modal__word-usage {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.translation-modal__word-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 0.875rem;
}

.translation-modal__word-item--correct {
  background: #ecfdf5;
  border-left: 3px solid #10b981;
}

.translation-modal__word-item--incorrect {
  background: #fef2f2;
  border-left: 3px solid #ef4444;
}

.translation-modal__word-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  font-weight: 700;
  font-size: 0.75rem;
}

.translation-modal__word-item--correct .translation-modal__word-icon {
  background: #10b981;
  color: white;
}

.translation-modal__word-item--incorrect .translation-modal__word-icon {
  background: #ef4444;
  color: white;
}

.translation-modal__word-text {
  font-weight: 600;
  color: #1f2937;
  min-width: 80px;
}

.translation-modal__word-suggestion {
  flex: 1;
  color: #6b7280;
  font-size: 0.8125rem;
}

.translation-modal__reference {
  padding: 12px;
  margin-bottom: 8px;
  background: white;
  border-radius: 8px;
}

.translation-modal__reference:last-child {
  margin-bottom: 0;
}

.translation-modal__reference-label {
  margin-bottom: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--app-font-color-muted, #475569);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.translation-modal__reference p {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.6;
  color: #374151;
}

.translation-modal__section details {
  cursor: pointer;
}

.translation-modal__section summary {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--app-font-color-muted, #475569);
  user-select: none;
  margin-bottom: 12px;
}

.translation-modal__section summary:hover {
  color: var(--app-font-color-muted, #64748b);
}

.translation-modal__comparison {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.translation-modal__comparison-item {
  padding: 12px;
  background: white;
  border-radius: 8px;
}

.translation-modal__comparison-item strong {
  display: block;
  margin-bottom: 6px;
  font-size: 0.8125rem;
  color: var(--app-font-color-muted, #475569);
}

.translation-modal__comparison-item p {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.6;
  color: #374151;
}

@media (max-width: 768px) {
  .translation-modal {
    max-width: 100%;
    margin: 0;
    border-radius: 12px;
  }

  .translation-modal__body {
    padding: 16px;
  }

  .translation-modal__score-circle {
    width: 100px;
    height: 100px;
  }

  .translation-modal__score-number {
    font-size: 2.25rem;
  }
}
</style>
