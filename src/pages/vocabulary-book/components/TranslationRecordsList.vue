<script setup lang="ts">
import { FileCheck } from 'lucide-vue-next'

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

defineProps<{
  records: TranslationRecord[]
}>()

const emit = defineEmits<{
  viewRecord: [record: TranslationRecord]
}>()

function getScoreColor(score: number): string {
  if (score >= 90) return 'gold'
  if (score >= 80) return 'blue'
  if (score >= 70) return 'green'
  return 'orange'
}
</script>

<template>
  <div v-if="records.length > 0" class="translation-records">
    <button 
      v-for="record in records" 
      :key="record.id"
      class="translation-record-item" 
      type="button" 
      @click="emit('viewRecord', record)"
    >
      <FileCheck :size="14" />
      <span class="translation-record-item__title">Translation Practice</span>
      <span 
        class="translation-record-item__score" 
        :class="`translation-record-item__score--${getScoreColor(record.score)}`"
      >
        {{ record.score }}
      </span>
      <span class="translation-record-item__arrow">View ?</span>
    </button>
  </div>
</template>

<style scoped>
.translation-records {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.translation-record-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(248, 250, 252, 0.7);
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 8px;
  color: var(--app-font-color-muted, #475569);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
  text-align: left;
}

.translation-record-item:hover {
  background: rgba(241, 245, 249, 0.9);
  border-color: var(--app-font-color-soft, #94a3b8);
  transform: translateX(2px);
}

.translation-record-item__title {
  flex: 1;
}

.translation-record-item__score {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  color: white;
}

.translation-record-item__score--gold {
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
}

.translation-record-item__score--blue {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
}

.translation-record-item__score--green {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.translation-record-item__score--orange {
  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
}

.translation-record-item__arrow {
  color: var(--app-font-color-muted, #64748b);
  font-size: 12px;
}
</style>
