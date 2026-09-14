<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ArrowLeft, ChevronDown, ListChecks } from 'lucide-vue-next'
import type { ChoiceQuizRecord, ChoiceQuizRecordDetail } from '@/db/schema/database'

const props = defineProps<{
  show: boolean
  date: string
  records: ChoiceQuizRecord[]
  remainingWrongCount: number
}>()

const emit = defineEmits<{
  close: []
  generate: []
}>()

const selectedRecord = ref<ChoiceQuizRecord | null>(null)
const expandedKey = ref<string | null>(null)

watch(
  () => props.show,
  (visible) => {
    if (!visible) {
      selectedRecord.value = null
      expandedKey.value = null
    }
  },
)

watch(selectedRecord, () => {
  expandedKey.value = null
})

const optionLabels = ['A', 'B', 'C', 'D']

/** 错题在前，对题在后 */
const sortedDetails = computed(() => {
  if (!selectedRecord.value) return []
  const details = selectedRecord.value.details.map((detail, index) => ({ detail, index }))
  return details.sort((a, b) => {
    if (a.detail.isCorrect === b.detail.isCorrect) return a.index - b.index
    return a.detail.isCorrect ? 1 : -1
  })
})

/** 取出四个选项（兼容旧数据 / 异常格式） */
function getOptions(detail: ChoiceQuizRecordDetail): string[] {
  const raw = detail.options
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((o) => String(o).trim()).filter(Boolean).slice(0, 4)
  }
  return []
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  const hh = d.getHours().toString().padStart(2, '0')
  const mm = d.getMinutes().toString().padStart(2, '0')
  return `${hh}:${mm}`
}

function scoreColor(accuracy: number): string {
  if (accuracy >= 90) return 'gold'
  if (accuracy >= 80) return 'blue'
  if (accuracy >= 70) return 'green'
  return 'orange'
}

function previewQuestion(text: string): string {
  const clean = (text || '').replace(/\s+/g, ' ').trim()
  if (clean.length <= 36) return clean
  return `${clean.slice(0, 36)}...`
}

function handleBack() {
  if (selectedRecord.value) {
    selectedRecord.value = null
    return
  }
  emit('close')
}

function toggleCard(key: string) {
  expandedKey.value = expandedKey.value === key ? null : key
}

function isUserOption(detail: ChoiceQuizRecordDetail, option: string) {
  return detail.userAnswer === option
}

function isCorrectOption(detail: ChoiceQuizRecordDetail, option: string) {
  return detail.correctAnswer === option
}
</script>

<template>
  <Transition name="choice-record-page">
    <div v-if="show" class="choice-record-page">
      <header class="choice-record-page__header">
        <button
          type="button"
          class="choice-record-page__back"
          aria-label="返回"
          @click="handleBack"
        >
          <ArrowLeft :size="18" :stroke-width="2.5" />
        </button>

        <div class="choice-record-page__title">
          <h1>选择题练习记录</h1>
          <p v-if="selectedRecord">
            {{ selectedRecord.total }} 题 · 正确 {{ selectedRecord.correct }} · 错误 {{ selectedRecord.wrong }}
          </p>
          <p v-else-if="records.length > 0">共 {{ records.length }} 批练习</p>
          <p v-else>还未做题</p>
        </div>

        <button
          type="button"
          class="choice-record-page__generate"
          @click="emit('generate')"
        >
          生成
          <span v-if="remainingWrongCount > 0" class="choice-record-page__badge">
            {{ remainingWrongCount }}
          </span>
        </button>
      </header>

      <main class="choice-record-page__content">
        <!-- 批次详情：分数 + 可展开卡片（错题在前） -->
        <template v-if="selectedRecord">
          <section class="choice-record-page__summary">
            <div class="choice-record-page__accuracy">
              <span class="choice-record-page__accuracy-value">{{ selectedRecord.accuracy }}%</span>
              <span class="choice-record-page__accuracy-label">准确率</span>
            </div>
            <div class="choice-record-page__stats">
              <div class="choice-record-page__stat">
                <strong>{{ selectedRecord.total }}</strong>
                <span>总题数</span>
              </div>
              <div class="choice-record-page__stat choice-record-page__stat--ok">
                <strong>{{ selectedRecord.correct }}</strong>
                <span>正确</span>
              </div>
              <div class="choice-record-page__stat choice-record-page__stat--bad">
                <strong>{{ selectedRecord.wrong }}</strong>
                <span>错误</span>
              </div>
            </div>
          </section>

          <section class="choice-record-page__cards">
            <h2>逐题回顾</h2>
            <button
              v-for="{ detail, index } in sortedDetails"
              :key="`${selectedRecord.id}-${index}`"
              type="button"
              class="choice-q-card"
              :class="{
                'is-expanded': expandedKey === `${selectedRecord.id}-${index}`,
                'is-wrong': !detail.isCorrect,
              }"
              @click="toggleCard(`${selectedRecord.id}-${index}`)"
            >
              <div class="choice-q-card__row">
                <strong class="choice-q-card__word">{{ detail.word }}</strong>
                <span class="choice-q-card__preview">{{ previewQuestion(detail.question) }}</span>
                <ChevronDown
                  class="choice-q-card__chevron"
                  :class="{ 'is-open': expandedKey === `${selectedRecord.id}-${index}` }"
                  :size="16"
                />
              </div>

              <div
                v-if="expandedKey === `${selectedRecord.id}-${index}`"
                class="choice-q-card__body"
                @click.stop
              >
                <p class="choice-q-card__question">{{ detail.question }}</p>

                <div class="choice-q-card__options">
                  <div class="choice-q-card__options-title">选项</div>
                  <template v-if="getOptions(detail).length > 0">
                    <div
                      v-for="(option, idx) in getOptions(detail)"
                      :key="idx"
                      class="choice-q-card__option"
                      :class="{
                        'is-correct': isCorrectOption(detail, option),
                        'is-wrong-pick': isUserOption(detail, option) && !detail.isCorrect,
                        'is-user': isUserOption(detail, option) && detail.isCorrect,
                      }"
                    >
                      <span class="choice-q-card__option-label">{{ optionLabels[idx] || idx + 1 }}</span>
                      <span class="choice-q-card__option-text">{{ option }}</span>
                    </div>
                  </template>
                  <p v-else class="choice-q-card__options-missing">
                    本题未保存选项（旧记录）。重新「生成」并完成练习后即可查看四个选项。
                  </p>
                </div>

                <div class="choice-q-card__answers">
                  <div>
                    <span class="choice-q-card__label">你的答案</span>
                    <span
                      class="choice-q-card__value"
                      :class="detail.isCorrect ? 'is-ok' : 'is-bad'"
                    >
                      {{ detail.userAnswer || '未作答' }}
                    </span>
                  </div>
                  <div>
                    <span class="choice-q-card__label">正确答案</span>
                    <span class="choice-q-card__value is-ok">{{ detail.correctAnswer }}</span>
                  </div>
                </div>

                <p v-if="detail.explanation" class="choice-q-card__explain">
                  {{ detail.explanation }}
                </p>
              </div>
            </button>
          </section>
        </template>

        <!-- 批次列表（原来的样式） -->
        <template v-else>
          <div v-if="records.length === 0" class="choice-record-page__empty">
            <p class="choice-record-page__empty-title">还未做题</p>
            <p class="choice-record-page__empty-desc">
              先完成默写测试产生错题，再点右上角「生成」开始选择题练习。
            </p>
          </div>

          <section v-else class="choice-record-page__batches">
            <h2>历史练习</h2>
            <button
              v-for="(record, index) in records"
              :key="record.id"
              type="button"
              class="choice-record-page__batch"
              @click="selectedRecord = record"
            >
              <ListChecks :size="16" />
              <div class="choice-record-page__batch-main">
                <strong>第 {{ records.length - index }} 批 · {{ record.total }} 题</strong>
                <span>{{ formatTime(record.createdAt) }}</span>
              </div>
              <span
                class="choice-record-page__batch-score"
                :class="`choice-record-page__batch-score--${scoreColor(record.accuracy)}`"
              >
                {{ record.accuracy }}%
              </span>
            </button>
          </section>
        </template>
      </main>
    </div>
  </Transition>
</template>

<style scoped>
.choice-record-page-enter-active,
.choice-record-page-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.choice-record-page-enter-from,
.choice-record-page-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.choice-record-page {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  flex-direction: column;
  background: transparent;
  color: var(--app-font-color, #0f172a);
}

.choice-record-page__header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 56px;
  padding: 8px 12px 8px 16px;
  background: transparent;
  border-bottom: 1px solid transparent;
}

.choice-record-page__back {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--app-font-color-muted, #475569);
  cursor: pointer;
  flex-shrink: 0;
}

.choice-record-page__back:hover {
  background: transparent;
  color: var(--app-font-color, #0f172a);
}

.choice-record-page__title {
  flex: 1;
  min-width: 0;
  text-align: center;
}

.choice-record-page__title h1 {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 800;
  line-height: 1.3;
}

.choice-record-page__title p {
  margin: 2px 0 0;
  font-size: 0.6875rem;
  color: var(--app-font-color-soft, #94a3b8);
}

.choice-record-page__generate {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  flex-shrink: 0;
  min-width: 64px;
  height: 36px;
  padding: 0 12px;
  border: 0;
  border-radius: 999px;
  background: #334155;
  color: #fff;
  font-size: 0.8125rem;
  font-weight: 700;
  cursor: pointer;
}

.choice-record-page__generate:hover {
  background: #1e293b;
}

.choice-record-page__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.2);
  font-size: 0.625rem;
  font-weight: 700;
}

.choice-record-page__content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 16px 32px;
  max-width: 720px;
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
}

.choice-record-page__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  text-align: center;
  padding: 24px;
}

.choice-record-page__empty-title {
  margin: 0 0 8px;
  font-size: 1.125rem;
  font-weight: 800;
  color: var(--app-font-color, #0f172a);
}

.choice-record-page__empty-desc {
  margin: 0;
  max-width: 280px;
  font-size: 0.8125rem;
  line-height: 1.55;
  color: var(--app-font-color-soft, #94a3b8);
}

.choice-record-page__batches h2,
.choice-record-page__cards h2 {
  margin: 0 0 12px;
  font-size: 0.875rem;
  font-weight: 800;
  color: var(--app-font-color, #334155);
}

.choice-record-page__batch {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  margin-bottom: 10px;
  padding: 14px;
  border: 1px dashed rgba(148, 163, 184, 0.35);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.38);
  color: var(--app-font-color-muted, #475569);
  cursor: pointer;
  text-align: left;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
}

.choice-record-page__batch:hover {
  background: rgba(255, 255, 255, 0.48);
  border-color: rgba(148, 163, 184, 0.5);
}

.choice-record-page__batch-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.choice-record-page__batch-main strong {
  font-size: 0.875rem;
  color: var(--app-font-color, #0f172a);
}

.choice-record-page__batch-main span {
  font-size: 0.6875rem;
  color: var(--app-font-color-soft, #94a3b8);
}

.choice-record-page__batch-score {
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
}

.choice-record-page__batch-score--gold {
  background: rgba(254, 243, 199, 0.45);
  color: #b45309;
}

.choice-record-page__batch-score--blue {
  background: rgba(226, 232, 240, 0.45);
  color: var(--app-font-color, #334155);
}

.choice-record-page__batch-score--green {
  background: rgba(220, 252, 231, 0.45);
  color: #15803d;
}

.choice-record-page__batch-score--orange {
  background: rgba(255, 237, 213, 0.45);
  color: #c2410c;
}

.choice-record-page__summary {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 20px;
  padding: 20px 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.38);
  border: 1px dashed rgba(148, 163, 184, 0.35);
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
}

.choice-record-page__accuracy {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.choice-record-page__accuracy-value {
  font-size: 2.5rem;
  font-weight: 800;
  line-height: 1;
}

.choice-record-page__accuracy-label {
  font-size: 0.75rem;
  color: var(--app-font-color-soft, #94a3b8);
  font-weight: 600;
}

.choice-record-page__stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.choice-record-page__stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  border-radius: 12px;
  background: transparent;
  border: 1px dashed rgba(148, 163, 184, 0.3);
}

.choice-record-page__stat strong {
  font-size: 1.25rem;
  font-weight: 800;
}

.choice-record-page__stat span {
  font-size: 0.6875rem;
  color: var(--app-font-color-soft, #94a3b8);
  font-weight: 600;
}

.choice-record-page__stat--ok strong {
  color: #15803d;
}

.choice-record-page__stat--bad strong {
  color: #dc2626;
}

/* 题卡样式 */
.choice-q-card {
  display: block;
  width: 100%;
  margin-bottom: 10px;
  padding: 14px;
  border: 1px dashed rgba(148, 163, 184, 0.35);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.38);
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
  text-align: left;
  cursor: pointer;
}

.choice-q-card.is-wrong {
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
  border-color: rgba(220, 38, 38, 0.35);
  background: rgba(254, 242, 242, 0.42);
}

.choice-q-card__row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.choice-q-card__word {
  flex-shrink: 0;
  font-size: 0.9375rem;
  font-weight: 800;
  color: var(--app-font-color, #0f172a);
}

.choice-q-card__preview {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.8125rem;
  color: var(--app-font-color-soft, #94a3b8);
}

.choice-q-card__chevron {
  flex-shrink: 0;
  color: #cbd5e1;
  transition: transform 0.2s ease;
}

.choice-q-card__chevron.is-open {
  transform: rotate(180deg);
  color: var(--app-font-color-muted, #64748b);
}

.choice-q-card__body {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(148, 163, 184, 0.22);
}

.choice-q-card__question {
  margin: 0 0 12px;
  font-size: 0.875rem;
  line-height: 1.55;
  color: var(--app-font-color, #334155);
  font-weight: 600;
}

.choice-q-card__options {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.choice-q-card__options-title {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--app-font-color-soft, #94a3b8);
  margin-bottom: 2px;
}

.choice-q-card__options-missing {
  margin: 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(255, 251, 235, 0.45);
  border: 1px dashed rgba(253, 230, 138, 0.7);
  font-size: 0.75rem;
  line-height: 1.45;
  color: #92400e;
}

.choice-q-card__option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  background: transparent;
  border: 1px dashed rgba(148, 163, 184, 0.28);
  font-size: 0.8125rem;
  color: var(--app-font-color-muted, #475569);
}

.choice-q-card__option.is-user {
  background: rgba(240, 253, 244, 0.45);
  border-style: solid;
  border-color: rgba(187, 247, 208, 0.7);
}

.choice-q-card__option.is-correct {
  background: rgba(240, 253, 244, 0.45);
  border-style: solid;
  border-color: rgba(187, 247, 208, 0.7);
  color: #166534;
}

.choice-q-card__option.is-wrong-pick {
  background: rgba(254, 242, 242, 0.45);
  border-style: solid;
  border-color: rgba(254, 202, 202, 0.7);
  color: #b91c1c;
}

.choice-q-card__option-label {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: rgba(226, 232, 240, 0.65);
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--app-font-color-muted, #64748b);
}

.choice-q-card__option.is-correct .choice-q-card__option-label {
  background: #86efac;
  color: #14532d;
}

.choice-q-card__option.is-wrong-pick .choice-q-card__option-label {
  background: #fca5a5;
  color: #7f1d1d;
}

.choice-q-card__option-text {
  flex: 1;
  line-height: 1.4;
}

.choice-q-card__answers {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.8125rem;
}

.choice-q-card__answers > div {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.choice-q-card__label {
  flex-shrink: 0;
  min-width: 4.5em;
  color: var(--app-font-color-soft, #94a3b8);
  font-size: 0.75rem;
  font-weight: 600;
}

.choice-q-card__value {
  font-weight: 700;
  color: var(--app-font-color, #334155);
}

.choice-q-card__value.is-ok {
  color: #15803d;
}

.choice-q-card__value.is-bad {
  color: #dc2626;
}

.choice-q-card__explain {
  margin: 10px 0 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: transparent;
  border: 1px dashed rgba(148, 163, 184, 0.3);
  font-size: 0.75rem;
  line-height: 1.5;
  color: var(--app-font-color-muted, #64748b);
}
</style>
