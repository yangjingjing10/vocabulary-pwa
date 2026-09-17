<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'

import { getWordsByDate } from '@/db/repositories/words.repository'

const props = defineProps<{
  date: string
}>()

const emit = defineEmits<{
  openVocabulary: []
  startQuiz: [words: string[], date: string]
  openReview: []
  openArticle: [articleId: string]
  generateArticle: [words: string[], date: string]
}>()

const dayWords = ref<string[]>([])

async function refresh() {
  try {
    const words = await getWordsByDate(props.date)
    dayWords.value = words.map((w) => w.word)
  } catch (error) {
    console.error('Failed to load home entry data:', error)
    dayWords.value = []
  }
}

function openBook() {
  emit('openVocabulary')
}

function openRead() {
  emit('generateArticle', [...dayWords.value], props.date)
}

function openPractice() {
  // 无当日词时也允许进入：组卷阶段会混入昨日错题
  emit('startQuiz', [...dayWords.value], props.date)
}

function openReview() {
  emit('openReview')
}

onMounted(() => {
  void refresh()
})

watch(
  () => props.date,
  () => {
    void refresh()
  },
)

defineExpose({ reload: refresh })
</script>

<template>
  <nav class="home-text-nav" aria-label="学习入口">
    <button class="home-text-nav__item" type="button" @click="openBook">单词本</button>
    <button class="home-text-nav__item" type="button" @click="openRead">阅读</button>
    <button class="home-text-nav__item" type="button" @click="openPractice">练习</button>
    <button class="home-text-nav__item home-text-nav__item--review" type="button" @click="openReview">
      复习
    </button>
  </nav>
</template>

<style scoped>
.home-text-nav {
  width: min(100%, 360px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  background: transparent;
}

.home-text-nav__item {
  flex: 1;
  padding: 8px 0;
  border: 0;
  background: transparent;
  color: var(--app-font-color-muted, #64748b);
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  cursor: pointer;
  opacity: 0.72;
  transition: opacity 0.18s ease, color 0.18s ease, transform 0.18s ease;
}

.home-text-nav__item--review {
  letter-spacing: 0.1em;
}

.home-text-nav__item:hover {
  opacity: 1;
  color: var(--app-font-color, #0f172a);
}

.home-text-nav__item:active {
  transform: scale(0.96);
  opacity: 1;
}
</style>
