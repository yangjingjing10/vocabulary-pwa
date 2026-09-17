<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ArrowLeft, BookOpen, Newspaper, Sparkles } from 'lucide-vue-next'

import { getArticlesByDate } from '@/db/repositories/articles.repository'
import type { Article } from '@/db/schema/database'
import {
  loadArticleGenPrefs,
  saveArticleGenPrefs,
  ARTICLE_COUNT_OPTIONS,
  splitWordsEvenly,
  type ArticleGenPrefs,
} from '@/constants/article-gen-prefs'

const props = defineProps<{
  words: string[]
  date: string
}>()

const emit = defineEmits<{
  back: []
  startAi: [prefs: ArticleGenPrefs]
  startNews: []
  openArticle: [articleId: string]
}>()

const saved = ref<Article[]>([])
const loading = ref(true)
const prefs = ref<ArticleGenPrefs>(loadArticleGenPrefs())
const showAiOptions = ref(false)

const hasWords = computed(() => props.words.length > 0)

const perArticleEstimate = computed(() => {
  if (!hasWords.value) return 0
  const chunks = splitWordsEvenly(props.words, prefs.value.articleCount)
  if (!chunks.length) return 0
  return chunks[0].length
})

const actualArticleCount = computed(() => {
  if (!hasWords.value) return 0
  return splitWordsEvenly(props.words, prefs.value.articleCount).length
})

async function refresh() {
  loading.value = true
  try {
    if (!props.date) {
      saved.value = []
      return
    }
    saved.value = await getArticlesByDate(props.date)
  } catch (error) {
    console.error('[article-hub] load failed:', error)
    saved.value = []
  } finally {
    loading.value = false
  }
}

function kindLabel(article: Article) {
  if (article.kind === 'rss') return '新闻'
  if (article.kind === 'ai') return 'AI'
  return article.sources?.length ? '新闻' : '文章'
}

function openAiOptions() {
  if (!hasWords.value) return
  showAiOptions.value = true
}

function persistPrefs() {
  saveArticleGenPrefs(prefs.value)
}

function confirmStartAi() {
  persistPrefs()
  showAiOptions.value = false
  emit('startAi', { ...prefs.value })
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
</script>

<template>
  <div class="article-hub">
    <header class="article-hub__header">
      <button class="article-hub__icon" type="button" aria-label="返回" @click="emit('back')">
        <ArrowLeft :size="20" />
      </button>
      <h1>阅读</h1>
      <span class="article-hub__spacer" />
    </header>

    <main class="article-hub__main">
      <p class="article-hub__intro">
        选一条路：用今日单词练语境，或直接读真实新闻。生成/打开过的都会留在下面。
      </p>

      <div class="article-hub__modes">
        <button
          class="article-hub__mode"
          type="button"
          :disabled="!hasWords"
          @click="openAiOptions"
        >
          <span class="article-hub__mode-icon" aria-hidden="true">
            <Sparkles :size="18" />
          </span>
          <span class="article-hub__mode-copy">
            <strong>AI 主题短文</strong>
            <span>先定篇数，单词均分；题材由 AI 自定</span>
          </span>
        </button>

        <button class="article-hub__mode" type="button" @click="emit('startNews')">
          <span class="article-hub__mode-icon article-hub__mode-icon--news" aria-hidden="true">
            <Newspaper :size="18" />
          </span>
          <span class="article-hub__mode-copy">
            <strong>今日新闻</strong>
            <span>拉 RSS 原文摘要阅读，可做段译，不改写</span>
          </span>
        </button>
      </div>

      <p v-if="!hasWords" class="article-hub__hint">
        今日还没有单词时，仍可阅读新闻；AI 短文需要先导入单词。
      </p>

      <section class="article-hub__saved">
        <h2 class="article-hub__saved-title">
          <BookOpen :size="14" />
          今日已保存
        </h2>
        <p v-if="loading" class="article-hub__empty">加载中…</p>
        <p v-else-if="!saved.length" class="article-hub__empty">还没有保存的文章</p>
        <ul v-else class="article-hub__list">
          <li v-for="item in saved" :key="item.id">
            <button class="article-hub__item" type="button" @click="emit('openArticle', item.id)">
              <span class="article-hub__tag">{{ kindLabel(item) }}</span>
              <span class="article-hub__item-title">{{ item.title }}</span>
              <span v-if="item.theme" class="article-hub__item-theme">{{ item.theme }}</span>
            </button>
          </li>
        </ul>
      </section>
    </main>

    <Teleport to="body">
      <div
        v-if="showAiOptions"
        class="article-hub__sheet"
        role="dialog"
        aria-modal="true"
        aria-label="生成设置"
        @click.self="showAiOptions = false"
      >
        <div class="article-hub__panel">
          <h3>AI 短文设置</h3>
          <p class="article-hub__panel-desc">
            今日共 {{ words.length }} 词。将生成
            <strong>{{ actualArticleCount }}</strong>
            篇，约每篇
            <strong>{{ perArticleEstimate }}</strong>
            词；题材由 AI 根据分到的词自行决定。
          </p>

          <label class="article-hub__field">
            <span>生成几篇文章</span>
            <select v-model.number="prefs.articleCount" @change="persistPrefs">
              <option v-for="n in ARTICLE_COUNT_OPTIONS" :key="n" :value="n">
                {{ n }} 篇
              </option>
            </select>
          </label>

          <div class="article-hub__actions">
            <button type="button" class="article-hub__btn article-hub__btn--ghost" @click="showAiOptions = false">
              取消
            </button>
            <button type="button" class="article-hub__btn" @click="confirmStartAi">
              开始生成
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.article-hub {
  min-height: 100vh;
  color: var(--app-font-color, #0f172a);
  padding-bottom: 2rem;
}

.article-hub__header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: grid;
  grid-template-columns: 44px 1fr 44px;
  align-items: center;
  min-height: 56px;
  padding: 8px;
  padding-top: max(8px, env(safe-area-inset-top));
  background: transparent;
}

.article-hub__header h1 {
  margin: 0;
  text-align: center;
  font-size: 1rem;
  font-weight: 700;
}

.article-hub__icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.article-hub__spacer {
  width: 44px;
}

.article-hub__main {
  padding: 12px 16px 28px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.article-hub__intro {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.55;
  color: var(--app-font-color-muted, #64748b);
}

.article-hub__modes {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.article-hub__mode {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  padding: 14px;
  border: 0;
  border-radius: 14px;
  background: rgba(148, 163, 184, 0.14);
  text-align: left;
  color: inherit;
  cursor: pointer;
}

.article-hub__mode:disabled {
  opacity: 0.45;
  cursor: default;
}

.article-hub__mode:not(:disabled):active {
  opacity: 0.85;
}

.article-hub__mode-icon {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.08);
  flex-shrink: 0;
}

.article-hub__mode-icon--news {
  background: rgba(14, 116, 144, 0.12);
}

.article-hub__mode-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.article-hub__mode-copy strong {
  font-size: 0.9375rem;
}

.article-hub__mode-copy span {
  font-size: 0.75rem;
  line-height: 1.4;
  color: var(--app-font-color-muted, #64748b);
}

.article-hub__hint {
  margin: 0;
  font-size: 0.75rem;
  color: var(--app-font-color-soft, #94a3b8);
}

.article-hub__saved-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 10px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--app-font-color-soft, #94a3b8);
}

.article-hub__empty {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--app-font-color-soft, #94a3b8);
}

.article-hub__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.article-hub__item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  width: 100%;
  padding: 12px 12px;
  border: 0;
  border-radius: 12px;
  background: rgba(148, 163, 184, 0.1);
  text-align: left;
  color: inherit;
  cursor: pointer;
}

.article-hub__tag {
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--app-font-color-muted, #64748b);
}

.article-hub__item-title {
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.35;
}

.article-hub__item-theme {
  font-size: 0.6875rem;
  color: var(--app-font-color-soft, #94a3b8);
}

.article-hub__sheet {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 16px;
  padding-bottom: max(16px, env(safe-area-inset-bottom));
  background: rgba(15, 23, 42, 0.35);
}

.article-hub__panel {
  width: min(420px, 100%);
  padding: 18px 16px 16px;
  border-radius: 16px;
  background: #f8fafc;
  color: #0f172a;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.article-hub__panel h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
}

.article-hub__panel-desc {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.45;
  color: #64748b;
}

.article-hub__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #475569;
}

.article-hub__field select {
  height: 40px;
  padding: 0 10px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  background: #fff;
  color: #0f172a;
  font-size: 0.875rem;
}

.article-hub__actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.article-hub__btn {
  flex: 1;
  height: 42px;
  border: 0;
  border-radius: 999px;
  background: #0f172a;
  color: #fff;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}

.article-hub__btn--ghost {
  background: transparent;
  color: #475569;
  border: 1px solid #cbd5e1;
}
</style>
