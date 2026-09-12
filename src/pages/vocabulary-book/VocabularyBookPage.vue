<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Camera, FileText, Search, Upload, X } from 'lucide-vue-next'

import { useWeekNavigation } from './composables/useWeekNavigation'
import { useVocabularyData, type DayData } from './composables/useVocabularyData'

import VocabHeader from './components/VocabHeader.vue'
import VocabWeekControl from './components/VocabWeekControl.vue'
import VocabEmptyState from './components/VocabEmptyState.vue'
import VocabDayCard from './components/VocabDayCard.vue'
import VocabCalendarModal from './components/VocabCalendarModal.vue'
import TranslationRecordModal from './components/TranslationRecordModal.vue'
import QuizStartConfirmModal from './components/QuizStartConfirmModal.vue'
import DayDeleteConfirmModal from './components/DayDeleteConfirmModal.vue'
import ChoiceQuizRecordsPage from './components/ChoiceQuizRecordsPage.vue'

import { getArticlesByDate, deleteArticle } from '@/db/repositories/articles.repository'
import { getWordsByDate, deleteWord } from '@/db/repositories/words.repository'
import {
  getChoiceQuizRecordsByDate,
  deleteChoiceQuizRecord,
} from '@/db/repositories/choice-quiz-records.repository'
import {
  getChoicePracticeState,
  getRemainingWrongWords,
} from '@/db/repositories/choice-practice-state.repository'
import {
  getTranslationRecordsByDate,
  deleteTranslationRecord,
} from '@/db/repositories/translation-records.repository'
import { initDatabase } from '@/db/index'

import '@/styles/pages/vocabulary-book-page.css'

const emit = defineEmits<{
  back: []
  generateArticle: [words: string[], date: string]
  openArticle: [articleId: string]
  startQuiz: [words: string[], date: string]
  openChoiceQuiz: [words: string[], date: string, wrongWords: string[]]
  openImport: [type: 'camera' | 'upload' | 'manual']
}>()

const showSearch = ref(false)
const searchQuery = ref('')
const showCalendarModal = ref(false)
const selectedTranslationRecord = ref<any>(null)
const showChoiceRecordsPage = ref(false)
const choiceRecordsDate = ref('')
const showQuizStartConfirm = ref(false)
const pendingQuizWords = ref<string[]>([])
const pendingQuizDate = ref('')
const showDayDeleteConfirm = ref(false)
const pendingDeleteDay = ref<DayData | null>(null)
const isDeletingDay = ref(false)
const showImportModal = ref(false)

const weekNav = useWeekNavigation()
const vocabData = useVocabularyData()

const activeChoiceDay = computed(() =>
  vocabData.weekDays.value.find((d) => d.date === choiceRecordsDate.value),
)

const pendingDeleteDateLabel = computed(() => {
  const day = pendingDeleteDay.value
  if (!day) return ''
  return `${day.dateFormatted} ${day.dayOfWeek}`
})

onMounted(async () => {
  await weekNav.initializeToCurrentWeek()
  await loadCurrentWeek()
})

watch(
  [weekNav.selectYear, weekNav.selectMonth, weekNav.currentWeekNum],
  async () => {
    await loadCurrentWeek()
  },
)

async function loadCurrentWeek() {
  const weekStart = weekNav.getWeekStartDate(
    weekNav.selectYear.value,
    weekNav.selectMonth.value,
    weekNav.currentWeekNum.value,
  )
  await vocabData.loadWeekData(weekStart)
}

async function handleStartQuiz(day: any) {
  const wordsToQuiz = day.words.map((w: any) => w.word)

  if (day.articleCount > 0) {
    emit('startQuiz', wordsToQuiz, day.date)
    return
  }

  pendingQuizWords.value = wordsToQuiz
  pendingQuizDate.value = day.date
  showQuizStartConfirm.value = true
}

function closeQuizStartConfirm() {
  showQuizStartConfirm.value = false
  pendingQuizWords.value = []
  pendingQuizDate.value = ''
}

function confirmGenerateArticleThenQuiz() {
  const words = [...pendingQuizWords.value]
  const date = pendingQuizDate.value
  closeQuizStartConfirm()
  emit('generateArticle', words, date)
}

function confirmStartQuizDirectly() {
  const words = [...pendingQuizWords.value]
  const date = pendingQuizDate.value
  closeQuizStartConfirm()
  emit('startQuiz', words, date)
}

async function handleOpenArticle(date: string) {
  try {
    const articles = await getArticlesByDate(date)
    if (articles.length > 0) {
      emit('openArticle', articles[0].id)
    }
  } catch (error) {
    console.error('Failed to open article:', error)
  }
}

/** 打开当天选择题练习记录页 */
function handleOpenChoiceRecords(date: string) {
  choiceRecordsDate.value = date
  showChoiceRecordsPage.value = true
}

function closeChoiceRecordsPage() {
  showChoiceRecordsPage.value = false
  choiceRecordsDate.value = ''
}

/** 记录页右上角「生成」：仅用剩余错题续练 */
async function handleGenerateChoiceQuiz() {
  const date = choiceRecordsDate.value
  try {
    const day = vocabData.weekDays.value.find((d) => d.date === date)
    if (!day || day.words.length === 0) {
      alert('该日期没有可用的单词')
      return
    }

    const state = await getChoicePracticeState(date)
    const remaining = getRemainingWrongWords(state)

    if (remaining.length === 0) {
      alert('没有更多错题了')
      return
    }

    const words = day.words.map((w) => w.word)
    showChoiceRecordsPage.value = false
    emit('openChoiceQuiz', words, date, remaining)
  } catch (error) {
    console.error('Failed to generate choice quiz:', error)
    alert('无法生成选择题，请重试')
  }
}

function handleViewRecord(record: any) {
  selectedTranslationRecord.value = record
}

function closeTranslationModal() {
  selectedTranslationRecord.value = null
}

function handleSelectWeek(weekNum: number) {
  weekNav.selectWeek(weekNum)
  showCalendarModal.value = false
}

async function handleResetToCurrent() {
  await weekNav.resetToCurrentWeek()
  showCalendarModal.value = false
}

function handleRequestDeleteDay(day: DayData) {
  if (!day.hasWords) return
  pendingDeleteDay.value = day
  showDayDeleteConfirm.value = true
}

function closeDayDeleteConfirm() {
  showDayDeleteConfirm.value = false
  pendingDeleteDay.value = null
}

function openImportModal() {
  showImportModal.value = true
}

function closeImportModal() {
  showImportModal.value = false
}

function handleImport(type: 'camera' | 'upload' | 'manual') {
  showImportModal.value = false
  emit('openImport', type)
}

async function confirmDeleteDay() {
  const day = pendingDeleteDay.value
  if (!day || isDeletingDay.value) return

  isDeletingDay.value = true
  try {
    const date = day.date
    const words = await getWordsByDate(date)
    await Promise.all(words.map((word) => deleteWord(word.id)))

    const articles = await getArticlesByDate(date)
    await Promise.all(articles.map((article) => deleteArticle(article.id)))

    const translations = await getTranslationRecordsByDate(date)
    await Promise.all(translations.map((record) => deleteTranslationRecord(record.id)))

    const choiceRecords = await getChoiceQuizRecordsByDate(date)
    await Promise.all(choiceRecords.map((record) => deleteChoiceQuizRecord(record.id)))

    const db = await initDatabase()
    if (db.objectStoreNames.contains('choicePracticeStates')) {
      await db.delete('choicePracticeStates', date)
    }

    closeDayDeleteConfirm()
    await loadCurrentWeek()
  } catch (error) {
    console.error('Failed to delete day data:', error)
    alert('删除失败，请重试')
  } finally {
    isDeletingDay.value = false
  }
}
</script>

<template>
  <div class="vocabulary-book-page">
    <template v-if="!showChoiceRecordsPage">
      <VocabHeader
        :total-words="vocabData.totalWordsThisWeek.value"
        :show-search="showSearch"
        @back="emit('back')"
        @toggle-search="showSearch = !showSearch"
        @open-import="openImportModal"
      />

      <VocabWeekControl
        :week-label="weekNav.currentWeekLabel.value"
        :can-go-prev="weekNav.currentWeekNum.value > 1"
        :can-go-next="weekNav.currentWeekNum.value < 4"
        @prev="weekNav.prevWeek"
        @next="weekNav.nextWeek"
        @open-calendar="showCalendarModal = true"
      />

      <div v-if="showSearch" class="vocab-search">
        <Search :size="14" />
        <input v-model="searchQuery" type="text" placeholder="Search words..." />
      </div>

      <main class="vocab-content">
        <VocabEmptyState v-if="!vocabData.hasAnyWords.value" />

        <div v-else class="vocab-timeline">
          <VocabDayCard
            v-for="day in vocabData.weekDays.value"
            :key="day.date"
            :day="day"
            @toggle-expand="vocabData.toggleDayExpand(day)"
            @start-quiz="handleStartQuiz(day)"
            @open-article="handleOpenArticle"
            @open-choice-records="handleOpenChoiceRecords"
            @view-record="handleViewRecord"
            @request-delete="handleRequestDeleteDay(day)"
          />
        </div>
      </main>

      <VocabCalendarModal
        :show="showCalendarModal"
        :year="weekNav.selectYear.value"
        :month="weekNav.selectMonth.value"
        :current-week="weekNav.currentWeekNum.value"
        :weeks="weekNav.monthWeeks.value"
        @close="showCalendarModal = false"
        @change-month="weekNav.changeMonth"
        @select-week="handleSelectWeek"
        @reset-to-current="handleResetToCurrent"
      />

      <TranslationRecordModal
        :record="selectedTranslationRecord"
        @close="closeTranslationModal"
      />

      <QuizStartConfirmModal
        :show="showQuizStartConfirm"
        @close="closeQuizStartConfirm"
        @generate-article="confirmGenerateArticleThenQuiz"
        @start-quiz="confirmStartQuizDirectly"
      />

      <DayDeleteConfirmModal
        :show="showDayDeleteConfirm"
        :date-label="pendingDeleteDateLabel"
        :word-count="pendingDeleteDay?.words.length ?? 0"
        @close="closeDayDeleteConfirm"
        @confirm="confirmDeleteDay"
      />

      <Transition name="import-modal">
        <div
          v-if="showImportModal"
          class="import-modal-overlay"
          @click.self="closeImportModal"
        >
          <div class="import-modal">
            <div class="import-modal__header">
              <h2>Import Words</h2>
              <button type="button" aria-label="Close" @click="closeImportModal">
                <X :size="20" />
              </button>
            </div>
            <div class="import-modal__grid">
              <button class="import-card" type="button" @click="handleImport('camera')">
                <div class="import-card__icon import-card__icon--blue">
                  <Camera :size="32" />
                </div>
                <h3>Camera OCR</h3>
                <p>Take photo to extract words</p>
              </button>
              <button class="import-card" type="button" @click="handleImport('upload')">
                <div class="import-card__icon import-card__icon--green">
                  <Upload :size="32" />
                </div>
                <h3>Import File</h3>
                <p>Select image or text file</p>
              </button>
              <button class="import-card" type="button" @click="handleImport('manual')">
                <div class="import-card__icon import-card__icon--purple">
                  <FileText :size="32" />
                </div>
                <h3>Manual Input</h3>
                <p>Type words directly</p>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </template>

    <ChoiceQuizRecordsPage
      :show="showChoiceRecordsPage"
      :date="choiceRecordsDate"
      :records="activeChoiceDay?.choiceQuizRecords ?? []"
      :remaining-wrong-count="activeChoiceDay?.remainingWrongCount ?? 0"
      @close="closeChoiceRecordsPage"
      @generate="handleGenerateChoiceQuiz"
    />
  </div>
</template>
