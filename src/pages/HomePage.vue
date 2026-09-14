<script setup lang="ts">
import { ref } from 'vue'

import BottomNavigation from '@/components/navigation/BottomNavigation.vue'
import TodayWordCarousel from '@/pages/home/components/TodayWordCarousel.vue'
import HomeOrbitNav from '@/pages/home/components/HomeOrbitNav.vue'
import HomeWeekTimeline from '@/pages/home/components/HomeWeekTimeline.vue'
import { todayLocalDate } from '@/utils/localDate'

import '@/styles/pages/home-page.css'

const selectedDate = ref(todayLocalDate())

defineProps<{
  activeTab: 'study' | 'home'
  avatar?: string
}>()

const emit = defineEmits<{
  navigate: [tab: 'study' | 'home']
  openVocabulary: []
  startQuiz: [words: string[], date: string]
  openArticle: [articleId: string]
  generateArticle: [words: string[], date: string]
}>()
</script>

<template>
  <div class="home-page">
    <main class="home-main" aria-live="polite">
      <section class="home-timeline-section" aria-label="本周日期">
        <HomeWeekTimeline v-model="selectedDate" :avatar="avatar" />
      </section>

      <section class="home-carousel-section" aria-label="单词旋转木马">
        <TodayWordCarousel :date="selectedDate" />
      </section>

      <section class="home-lower-section">
        <HomeOrbitNav
          :date="selectedDate"
          @open-vocabulary="emit('openVocabulary')"
          @start-quiz="(words, date) => emit('startQuiz', words, date)"
          @open-article="(id) => emit('openArticle', id)"
          @generate-article="(words, date) => emit('generateArticle', words, date)"
        />
      </section>
    </main>

    <BottomNavigation :active-tab="activeTab" @navigate="$emit('navigate', $event)" />
  </div>
</template>
