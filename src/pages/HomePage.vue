<script setup lang="ts">
import { ref } from 'vue'

import BottomNavigation from '@/components/navigation/BottomNavigation.vue'
import TodayWordCarousel, {
  type CarouselWord,
} from '@/pages/home/components/TodayWordCarousel.vue'
import WordDetailPage from '@/pages/home/components/WordDetailPage.vue'
import HomeOrbitNav from '@/pages/home/components/HomeOrbitNav.vue'
import HomeWeekTimeline from '@/pages/home/components/HomeWeekTimeline.vue'
import ReviewSetupModal from '@/pages/home/components/ReviewSetupModal.vue'
import { peekUnfinishedQuizBatch } from '@/pages/word-quiz/composables/useQuizPause'
import { todayLocalDate } from '@/utils/localDate'

import '@/styles/pages/home-page.css'

const selectedDate = ref(todayLocalDate())
const carouselRef = ref<InstanceType<typeof TodayWordCarousel> | null>(null)

const detailOpen = ref(false)
const detailWords = ref<CarouselWord[]>([])
const detailIndex = ref(0)
const showReviewSetup = ref(false)

defineProps<{
  activeTab: 'study' | 'home'
  avatar?: string
}>()

const emit = defineEmits<{
  navigate: [tab: 'study' | 'home']
  openVocabulary: []
  startQuiz: [words: string[], date: string]
  startReview: [words: string[], date: string]
  resumeReview: [date: string]
  openArticle: [articleId: string]
  generateArticle: [words: string[], date: string]
}>()

function openWordDetail(payload: { words: CarouselWord[]; index: number }) {
  if (!payload.words.length) return
  detailWords.value = payload.words
  detailIndex.value = payload.index
  detailOpen.value = true
}

function closeWordDetail() {
  detailOpen.value = false
  carouselRef.value?.resumeAuto?.()
}

function syncCarouselIndex(index: number) {
  carouselRef.value?.setIndex?.(index)
}

function handleOpenReview() {
  // 有未完成复习时直接续测，不要再弹「选多少个」
  const unfinished = peekUnfinishedQuizBatch(todayLocalDate(), 'review')
  if (unfinished) {
    emit('resumeReview', todayLocalDate())
    return
  }
  showReviewSetup.value = true
}

function handleReviewStart(payload: { words: string[]; date: string }) {
  showReviewSetup.value = false
  emit('startReview', payload.words, payload.date)
}
</script>

<template>
  <div class="home-page">
    <main class="home-main" aria-live="polite">
      <section class="home-timeline-section" aria-label="本周日期">
        <HomeWeekTimeline v-model="selectedDate" :avatar="avatar" />
      </section>

      <section class="home-carousel-section" aria-label="单词旋转木马">
        <TodayWordCarousel
          ref="carouselRef"
          :date="selectedDate"
          @open-detail="openWordDetail"
        />
      </section>

      <section class="home-lower-section">
        <HomeOrbitNav
          :date="selectedDate"
          @open-vocabulary="emit('openVocabulary')"
          @start-quiz="(words, date) => emit('startQuiz', words, date)"
          @open-review="handleOpenReview"
          @open-article="(id) => emit('openArticle', id)"
          @generate-article="(words, date) => emit('generateArticle', words, date)"
        />
      </section>
    </main>

    <BottomNavigation :active-tab="activeTab" @navigate="$emit('navigate', $event)" />

    <WordDetailPage
      v-if="detailOpen"
      :words="detailWords"
      :initial-index="detailIndex"
      @close="closeWordDetail"
      @sync-index="syncCarouselIndex"
    />

    <ReviewSetupModal
      :show="showReviewSetup"
      @close="showReviewSetup = false"
      @start="handleReviewStart"
    />
  </div>
</template>
