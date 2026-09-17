<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Loader2, X } from 'lucide-vue-next'
import {
  REVIEW_BATCH_MAX,
  REVIEW_BATCH_MIN,
  REVIEW_BATCH_OPTIONS,
  buildReviewSession,
  clampReviewBatchSize,
  estimateReviewPool,
  loadReviewPrefs,
  saveReviewPrefs,
  type ReviewMode,
  type ReviewSessionConfig,
} from '@/services/review-session.service'
import { shiftLocalDate, todayLocalDate } from '@/utils/localDate'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  close: []
  start: [payload: { words: string[]; date: string; wrongCount: number }]
}>()

const config = ref<ReviewSessionConfig>(loadReviewPrefs())
const customBatchInput = ref(String(config.value.batchSize))
const poolSize = ref(0)
const wrongCount = ref(0)
const isEstimating = ref(false)
const isStarting = ref(false)
const errorText = ref('')

const isPresetBatch = computed(() =>
  REVIEW_BATCH_OPTIONS.includes(
    config.value.batchSize as (typeof REVIEW_BATCH_OPTIONS)[number],
  ),
)

const canStart = computed(
  () => poolSize.value > 0 && !isEstimating.value && !isStarting.value,
)

const summaryText = computed(() => {
  if (isEstimating.value) return '正在统计可复习单词…'
  if (poolSize.value === 0) return '这个范围内还没有可复习的词'
  const wrongPart =
    wrongCount.value > 0 ? `，其中错题 ${wrongCount.value} 个优先` : ''
  const take = Math.min(config.value.batchSize, poolSize.value)
  return `可选 ${poolSize.value} 个${wrongPart} · 本次抽 ${take} 个`
})

let estimateTimer: ReturnType<typeof setTimeout> | null = null

async function refreshEstimate() {
  isEstimating.value = true
  errorText.value = ''
  try {
    const result = await estimateReviewPool(config.value)
    poolSize.value = result.poolSize
    wrongCount.value = result.wrongCount
  } catch (error) {
    console.error('estimate review pool failed:', error)
    poolSize.value = 0
    wrongCount.value = 0
    errorText.value = '统计失败，请重试'
  } finally {
    isEstimating.value = false
  }
}

function scheduleEstimate() {
  if (estimateTimer) clearTimeout(estimateTimer)
  estimateTimer = setTimeout(() => {
    void refreshEstimate()
  }, 180)
}

function setMode(mode: ReviewMode) {
  config.value = { ...config.value, mode }
  scheduleEstimate()
}

function setBatchSize(size: number) {
  const next = clampReviewBatchSize(size)
  config.value = { ...config.value, batchSize: next }
  customBatchInput.value = String(next)
  scheduleEstimate()
}

function onCustomBatchInput(event: Event) {
  const raw = (event.target as HTMLInputElement).value
  customBatchInput.value = raw.replace(/[^\d]/g, '')
  if (!customBatchInput.value) return
  const parsed = Number(customBatchInput.value)
  if (!Number.isFinite(parsed)) return
  const next = clampReviewBatchSize(parsed)
  config.value = { ...config.value, batchSize: next }
  scheduleEstimate()
}

function onCustomBatchBlur() {
  const parsed = Number(customBatchInput.value)
  const next = clampReviewBatchSize(Number.isFinite(parsed) ? parsed : config.value.batchSize)
  config.value = { ...config.value, batchSize: next }
  customBatchInput.value = String(next)
  scheduleEstimate()
}

function setQuickRange(days: number) {
  const today = todayLocalDate()
  config.value = {
    ...config.value,
    mode: 'range',
    startDate: shiftLocalDate(today, -(days - 1)),
    endDate: today,
  }
  scheduleEstimate()
}

watch(
  () => props.show,
  (visible) => {
    if (!visible) return
    config.value = loadReviewPrefs()
    customBatchInput.value = String(config.value.batchSize)
    void refreshEstimate()
  },
)

watch(
  () => [config.value.startDate, config.value.endDate, config.value.mode],
  () => {
    if (!props.show) return
    scheduleEstimate()
  },
)

async function handleStart() {
  if (!canStart.value) return
  isStarting.value = true
  errorText.value = ''
  try {
    config.value = {
      ...config.value,
      batchSize: clampReviewBatchSize(config.value.batchSize),
    }
    customBatchInput.value = String(config.value.batchSize)
    saveReviewPrefs(config.value)
    const plan = await buildReviewSession(config.value)
    if (plan.words.length === 0) {
      errorText.value = '没有可复习的单词'
      return
    }
    emit('start', {
      words: plan.words,
      date: todayLocalDate(),
      wrongCount: plan.wrongCount,
    })
  } catch (error) {
    console.error('build review session failed:', error)
    errorText.value = '组卷失败，请重试'
  } finally {
    isStarting.value = false
  }
}
</script>

<template>
  <Transition name="review-modal">
    <div
      v-if="show"
      class="review-setup-overlay"
      @click.self="emit('close')"
    >
      <div
        class="review-setup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-setup-title"
      >
        <header class="review-setup__header">
          <div>
            <p class="review-setup__eyebrow">Review</p>
            <h3 id="review-setup-title" class="review-setup__title">开始复习</h3>
          </div>
          <button
            type="button"
            class="review-setup__close"
            aria-label="关闭"
            @click="emit('close')"
          >
            <X :size="18" />
          </button>
        </header>

        <div class="review-setup__modes" role="tablist" aria-label="复习方式">
          <button
            type="button"
            class="review-setup__mode"
            :class="{ 'is-active': config.mode === 'mixed' }"
            @click="setMode('mixed')"
          >
            <strong>混合复习</strong>
            <span>全部学过 · 错题优先</span>
          </button>
          <button
            type="button"
            class="review-setup__mode"
            :class="{ 'is-active': config.mode === 'range' }"
            @click="setMode('range')"
          >
            <strong>按日期</strong>
            <span>自选哪天到哪天</span>
          </button>
        </div>

        <section v-if="config.mode === 'range'" class="review-setup__section">
          <div class="review-setup__quick">
            <button type="button" @click="setQuickRange(1)">昨天至今</button>
            <button type="button" @click="setQuickRange(7)">近 7 天</button>
            <button type="button" @click="setQuickRange(14)">近 14 天</button>
          </div>
          <div class="review-setup__dates">
            <label>
              <span>从</span>
              <input v-model="config.startDate" type="date" />
            </label>
            <label>
              <span>到</span>
              <input v-model="config.endDate" type="date" />
            </label>
          </div>
        </section>

        <section class="review-setup__section">
          <p class="review-setup__label">一次复习多少个</p>
          <div class="review-setup__batches">
            <button
              v-for="size in REVIEW_BATCH_OPTIONS"
              :key="size"
              type="button"
              class="review-setup__batch"
              :class="{ 'is-active': config.batchSize === size }"
              @click="setBatchSize(size)"
            >
              {{ size }}
            </button>
          </div>
          <label class="review-setup__custom">
            <span>自定义</span>
            <input
              :value="customBatchInput"
              type="number"
              inputmode="numeric"
              :min="REVIEW_BATCH_MIN"
              :max="REVIEW_BATCH_MAX"
              placeholder="例如 12"
              :class="{ 'is-active': !isPresetBatch }"
              @input="onCustomBatchInput"
              @blur="onCustomBatchBlur"
            />
            <span class="review-setup__custom-hint">{{ REVIEW_BATCH_MIN }}–{{ REVIEW_BATCH_MAX }}</span>
          </label>
        </section>

        <p class="review-setup__summary">
          <Loader2 v-if="isEstimating" :size="14" class="is-spinning" />
          <span>{{ summaryText }}</span>
        </p>
        <p v-if="errorText" class="review-setup__error">{{ errorText }}</p>
        <p class="review-setup__tip">
          答对的会先搁置；答错的会继续出现在本轮，直到这批练完。
        </p>

        <button
          type="button"
          class="review-setup__start"
          :disabled="!canStart"
          @click="handleStart"
        >
          <Loader2 v-if="isStarting" :size="16" class="is-spinning" />
          <span>{{ isStarting ? '组卷中…' : '开始复习' }}</span>
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.review-setup-overlay {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 16px;
  background: rgba(15, 23, 42, 0.42);
  backdrop-filter: blur(8px);
}

.review-setup {
  width: min(100%, 420px);
  max-height: min(88vh, 640px);
  overflow: auto;
  border-radius: 24px 24px 28px;
  padding: 20px 20px 18px;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(148, 163, 184, 0.35);
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.22);
  color: #0f172a;
}

.review-setup__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}

.review-setup__eyebrow {
  margin: 0 0 4px;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #64748b;
}

.review-setup__title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.review-setup__close {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(248, 250, 252, 0.9);
  color: #334155;
  display: grid;
  place-items: center;
  cursor: pointer;
}

.review-setup__modes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 16px;
}

.review-setup__mode {
  text-align: left;
  padding: 12px 12px 11px;
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(248, 250, 252, 0.85);
  cursor: pointer;
  transition: border-color 0.18s ease, background 0.18s ease;
}

.review-setup__mode strong {
  display: block;
  font-size: 0.9375rem;
  margin-bottom: 4px;
}

.review-setup__mode span {
  display: block;
  font-size: 0.75rem;
  color: #64748b;
  line-height: 1.35;
}

.review-setup__mode.is-active {
  border-color: rgba(51, 65, 85, 0.55);
  background: rgba(51, 65, 85, 0.08);
}

.review-setup__section {
  margin-bottom: 16px;
}

.review-setup__label {
  margin: 0 0 8px;
  font-size: 0.8125rem;
  font-weight: 700;
  color: #475569;
}

.review-setup__quick {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}

.review-setup__quick button {
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: transparent;
  color: #475569;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
}

.review-setup__dates {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.review-setup__dates label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
}

.review-setup__dates input {
  width: 100%;
  height: 40px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.45);
  padding: 0 10px;
  background: #fff;
  color: #0f172a;
  font-size: 0.875rem;
}

.review-setup__batches {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.review-setup__batch {
  min-width: 48px;
  height: 36px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: transparent;
  color: #334155;
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
}

.review-setup__batch.is-active {
  background: #334155;
  border-color: #334155;
  color: #fff;
}

.review-setup__custom {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #475569;
}

.review-setup__custom input {
  width: 88px;
  height: 36px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.45);
  padding: 0 10px;
  background: #fff;
  color: #0f172a;
  font-size: 0.875rem;
  font-weight: 700;
  text-align: center;
}

.review-setup__custom input.is-active {
  border-color: rgba(51, 65, 85, 0.65);
  box-shadow: 0 0 0 1px rgba(51, 65, 85, 0.12);
}

.review-setup__custom-hint {
  font-size: 0.6875rem;
  font-weight: 600;
  color: #94a3b8;
}

.review-setup__summary {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 8px;
  min-height: 20px;
  font-size: 0.8125rem;
  color: #475569;
}

.review-setup__error {
  margin: 0 0 8px;
  font-size: 0.8125rem;
  color: #dc2626;
}

.review-setup__tip {
  margin: 0 0 16px;
  font-size: 0.75rem;
  line-height: 1.45;
  color: #94a3b8;
}

.review-setup__start {
  width: 100%;
  height: 48px;
  border: 0;
  border-radius: 16px;
  background: #0f172a;
  color: #fff;
  font-size: 0.9375rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
}

.review-setup__start:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.is-spinning {
  animation: review-spin 0.9s linear infinite;
}

@keyframes review-spin {
  to {
    transform: rotate(360deg);
  }
}

.review-modal-enter-active,
.review-modal-leave-active {
  transition: opacity 0.22s ease;
}

.review-modal-enter-active .review-setup,
.review-modal-leave-active .review-setup {
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}

.review-modal-enter-from,
.review-modal-leave-to {
  opacity: 0;
}

.review-modal-enter-from .review-setup,
.review-modal-leave-to .review-setup {
  transform: translateY(18px);
}

@media (min-width: 640px) {
  .review-setup-overlay {
    align-items: center;
  }

  .review-setup {
    border-radius: 24px;
  }
}
</style>
