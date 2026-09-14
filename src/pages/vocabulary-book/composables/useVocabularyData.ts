import { ref, computed } from 'vue'
import { addLocalDays, formatLocalDate, startOfLocalDay, todayLocalDate } from '@/utils/localDate'
import { getAllWords } from '@/db/repositories/words.repository'
import { getArticlesByDate } from '@/db/repositories/articles.repository'
import { getTranslationRecordsByDate } from '@/db/repositories/translation-records.repository'
import { getChoiceQuizRecordsByDate } from '@/db/repositories/choice-quiz-records.repository'
import {
  getChoicePracticeState,
  getRemainingWrongWords,
} from '@/db/repositories/choice-practice-state.repository'
import type { ChoiceQuizRecord } from '@/db/schema/database'

export interface Word {
  id: number
  word: string
  phonetic: string
  pos: string
  translation: string
}

export interface DayData {
  date: string
  dateFormatted: string
  dayOfWeek: string
  isToday: boolean
  hasWords: boolean
  source: string
  expanded: boolean
  words: Word[]
  articleCount: number
  translationRecords: any[]
  choiceQuizRecords: ChoiceQuizRecord[]
  remainingWrongCount: number
}

/**
 * 单词数据管理
 * 负责加载、筛选、统计单词数据
 */
export function useVocabularyData() {
  const weekDays = ref<DayData[]>([])
  const isLoading = ref(false)

  const totalWordsThisWeek = computed(() =>
    weekDays.value.reduce((sum, day) => sum + day.words.length, 0),
  )

  const hasAnyWords = computed(() =>
    weekDays.value.some((day) => day.hasWords),
  )

  async function loadWeekData(weekStartDate: Date) {
    isLoading.value = true

    try {
      const allWords = await getAllWords()
      const days: DayData[] = []

      const weekStart = startOfLocalDay(weekStartDate)
      for (let i = 0; i < 7; i++) {
        const date = addLocalDays(weekStart, i)
        const dayData = await loadDayData(date, allWords)

        if (dayData.hasWords || dayData.isToday) {
          days.push(dayData)
        }
      }

      // 新的一天在前；始终展开今天（没词也展开）
      const ordered = days.reverse()
      const today = ordered.find((day) => day.isToday)
      if (today) today.expanded = true
      weekDays.value = ordered
    } catch (error) {
      console.error('Failed to load week data:', error)
    } finally {
      isLoading.value = false
    }
  }

  async function loadDayData(date: Date, allWords: any[]): Promise<DayData> {
    const dateStr = formatLocalDate(date)
    const dateFormatted = `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`
    const dayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()]
    const isToday = dateStr === todayLocalDate()

    const dayWords = allWords
      .filter((w) => w.date === dateStr)
      .map((w) => ({
        id: parseInt(w.id.split('-')[0]) || Date.now(),
        word: w.word,
        phonetic: w.phonetic || '',
        pos: w.pos || '',
        translation: w.translation || '',
      }))

    const dayArticles = await getArticlesByDate(dateStr)

    let dayTranslations: any[] = []
    try {
      dayTranslations = await getTranslationRecordsByDate(dateStr)
    } catch {
      // ignore
    }

    let choiceQuizRecords: ChoiceQuizRecord[] = []
    let remainingWrongCount = 0
    try {
      choiceQuizRecords = await getChoiceQuizRecordsByDate(dateStr)
      const practiceState = await getChoicePracticeState(dateStr)
      remainingWrongCount = getRemainingWrongWords(practiceState).length
    } catch {
      // ignore
    }

    return {
      date: dateStr,
      dateFormatted,
      dayOfWeek,
      isToday,
      hasWords: dayWords.length > 0,
      source: dayWords.length > 0 ? `${dayWords.length} words` : '',
      expanded: false,
      words: dayWords,
      articleCount: dayArticles.length,
      translationRecords: dayTranslations,
      choiceQuizRecords,
      remainingWrongCount,
    }
  }

  function toggleDayExpand(day: DayData) {
    if (day.hasWords) {
      day.expanded = !day.expanded
    }
  }

  return {
    weekDays,
    isLoading,
    totalWordsThisWeek,
    hasAnyWords,
    loadWeekData,
    toggleDayExpand,
  }
}
