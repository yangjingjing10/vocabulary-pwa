<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { FileText, ListChecks } from 'lucide-vue-next'
import type { DayData } from '../composables/useVocabularyData'
import VocabWordItem from './VocabWordItem.vue'
import TranslationRecordsList from './TranslationRecordsList.vue'

interface Props {
  day: DayData
}

const props = defineProps<Props>()

const emit = defineEmits<{
  toggleExpand: []
  startQuiz: []
  openArticle: [date: string]
  openChoiceRecords: [date: string]
  viewRecord: [record: any]
  requestDelete: []
}>()

const LONG_PRESS_MS = 520
let pressTimer: ReturnType<typeof setTimeout> | null = null
const suppressClick = ref(false)

function clearPressTimer() {
  if (pressTimer) {
    clearTimeout(pressTimer)
    pressTimer = null
  }
}

function startPress() {
  if (!props.day.hasWords) return
  clearPressTimer()
  pressTimer = setTimeout(() => {
    suppressClick.value = true
    emit('requestDelete')
    clearPressTimer()
  }, LONG_PRESS_MS)
}

function endPress() {
  clearPressTimer()
}

function handleHeaderClick() {
  if (suppressClick.value) {
    suppressClick.value = false
    return
  }
  emit('toggleExpand')
}

function handleContextMenu(event: Event) {
  if (!props.day.hasWords) return
  event.preventDefault()
}

onBeforeUnmount(() => {
  clearPressTimer()
})
</script>

<template>
  <div class="vocab-day">
    <div
      class="vocab-day__dot"
      :class="{ 'is-today': day.isToday, 'has-words': day.hasWords }"
    >
      <span v-if="day.isToday"></span>
    </div>

    <div
      class="vocab-day__card"
      :class="{ 'has-words': day.hasWords }"
      @pointerdown="startPress"
      @pointerup="endPress"
      @pointerleave="endPress"
      @pointercancel="endPress"
      @contextmenu="handleContextMenu"
    >
      <div class="vocab-day__header" @click="handleHeaderClick">
        <div>
          <div class="vocab-day__date">
            <strong>{{ day.dateFormatted }}</strong>
            <span>{{ day.dayOfWeek }}</span>
            <span v-if="day.isToday" class="vocab-today-badge">Today</span>
          </div>
          <div class="vocab-day__meta">
            <span v-if="day.hasWords">{{ day.words.length }} words</span>
            <span v-else>No words</span>
          </div>
        </div>

        <div class="vocab-day__actions">
          <button
            v-if="day.hasWords"
            type="button"
            class="vocab-start-quiz-btn"
            @pointerdown.stop
            @click.stop="emit('startQuiz')"
          >
            Start Quiz
          </button>
        </div>
      </div>

      <div v-if="day.hasWords && day.expanded" class="vocab-day__words">
        <div
          v-if="day.articleCount > 0 || day.hasWords"
          class="vocab-day__records"
        >
          <div class="vocab-day__records-title">Study Records</div>

          <button
            v-if="day.articleCount > 0"
            class="vocab-day__record-item"
            type="button"
            @pointerdown.stop
            @click.stop="emit('openArticle', day.date)"
          >
            <FileText :size="14" />
            <span>{{ day.articleCount }} Article(s)</span>
            <span class="vocab-day__record-arrow">View</span>
          </button>

          <button
            class="vocab-day__record-item"
            type="button"
            @pointerdown.stop
            @click.stop="emit('openChoiceRecords', day.date)"
          >
            <ListChecks :size="14" />
            <span>
              选择题
              <template v-if="day.choiceQuizRecords.length > 0">
                （{{ day.choiceQuizRecords.length }}）
              </template>
            </span>
            <span
              v-if="day.remainingWrongCount > 0"
              class="vocab-day__record-badge"
            >
              {{ day.remainingWrongCount }}
            </span>
            <span class="vocab-day__record-arrow">View</span>
          </button>
        </div>

        <TranslationRecordsList
          v-if="day.translationRecords.length > 0"
          :records="day.translationRecords"
          @view-record="emit('viewRecord', $event)"
        />

        <div
          v-else-if="day.articleCount === 0 && day.choiceQuizRecords.length === 0"
          class="vocab-day__no-records"
        >
          No records yet. Click "Start Quiz" to generate an article
        </div>

        <VocabWordItem
          v-for="word in day.words"
          :key="word.id"
          :word="word"
        />
      </div>
    </div>
  </div>
</template>
