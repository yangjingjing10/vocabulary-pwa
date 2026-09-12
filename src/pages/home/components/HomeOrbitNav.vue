<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'

import { getArticlesByDate } from '@/db/repositories/articles.repository'
import { getWordsByDate } from '@/db/repositories/words.repository'

const props = defineProps<{
  date: string
}>()

const emit = defineEmits<{
  openVocabulary: []
  startQuiz: [words: string[], date: string]
  openArticle: [articleId: string]
  generateArticle: [words: string[], date: string]
}>()

const dayWords = ref<string[]>([])
const dayArticleId = ref<string | null>(null)

async function refresh() {
  try {
    const [words, articles] = await Promise.all([
      getWordsByDate(props.date),
      getArticlesByDate(props.date),
    ])
    dayWords.value = words.map((w) => w.word)
    dayArticleId.value = articles[0]?.id ?? null
  } catch (error) {
    console.error('Failed to load home entry data:', error)
    dayWords.value = []
    dayArticleId.value = null
  }
}

function openBook() {
  emit('openVocabulary')
}

function openRead() {
  if (dayArticleId.value) {
    emit('openArticle', dayArticleId.value)
    return
  }
  if (dayWords.value.length > 0) {
    emit('generateArticle', [...dayWords.value], props.date)
    return
  }
  emit('openVocabulary')
}

function openPractice() {
  if (dayWords.value.length === 0) {
    emit('openVocabulary')
    return
  }
  emit('startQuiz', [...dayWords.value], props.date)
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
  </nav>
</template>

<style scoped>
.home-text-nav {
  width: min(100%, 300px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  background: transparent;
}

.home-text-nav__item {
  flex: 1;
  padding: 8px 0;
  border: 0;
  background: transparent;
  color: var(--app-font-color-muted, #64748b);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.08em;
  cursor: pointer;
  opacity: 0.72;
  transition: opacity 0.18s ease, color 0.18s ease, transform 0.18s ease;
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
