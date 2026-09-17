<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { ArrowLeft, ExternalLink, Loader2, RefreshCw } from 'lucide-vue-next'

import ParagraphTranslation from '@/pages/article-read/components/ParagraphTranslation.vue'
import ArticleSources from '@/pages/article-read/components/ArticleSources.vue'
import {
  findArticleByLink,
  putArticle,
} from '@/db/repositories/articles.repository'
import type { Article } from '@/db/schema/database'
import { fetchLatestRssItems, type RssItem } from '@/services/rss.service'
import { todayLocalDate } from '@/utils/localDate'

const props = defineProps<{
  date?: string
  /** 可选：打开新闻时若摘要里出现这些词可高亮（不强求） */
  words?: string[]
}>()

const emit = defineEmits<{
  back: []
  openSaved: [articleId: string]
}>()

const items = ref<RssItem[]>([])
const loading = ref(true)
const error = ref('')
const active = ref<Article | null>(null)
const opening = ref(false)

const day = computed(() => props.date || todayLocalDate())

function summaryToHtml(summary: string, title: string): string {
  const text = (summary || '').trim() || title
  const paras = text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
  if (!paras.length) return `<p>${escapeHtml(title)}</p>`
  return paras.map((p) => `<p>${escapeHtml(p)}</p>`).join('\n')
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function highlightWords(html: string, words: string[]): string {
  let result = html
  for (const word of words) {
    if (!word || word.length < 2) continue
    const re = new RegExp(`\\b(${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'gi')
    result = result.replace(re, '<mark>$1</mark>')
  }
  return result
}

function stableId(link: string, date: string): string {
  let hash = 0
  const s = `${date}|${link}`
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) | 0
  return `rss-${date}-${Math.abs(hash)}`
}

async function loadFeeds() {
  loading.value = true
  error.value = ''
  try {
    items.value = await fetchLatestRssItems(30)
  } catch (e) {
    error.value = e instanceof Error ? e.message : '拉取新闻失败'
    items.value = []
  } finally {
    loading.value = false
  }
}

async function openItem(item: RssItem) {
  if (!item.link || opening.value) return
  opening.value = true
  try {
    const existing = await findArticleByLink(day.value, item.link)
    if (existing) {
      active.value = existing
      return
    }

    const words = props.words ?? []
    let content = summaryToHtml(item.summary, item.title)
    if (words.length) content = highlightWords(content, words)

    const article: Article = {
      id: stableId(item.link, day.value),
      title: item.title,
      content,
      words: [...words],
      date: day.value,
      createdAt: Date.now(),
      kind: 'rss',
      link: item.link,
      theme: item.source,
      sources: [
        {
          title: item.title,
          link: item.link,
          outlet: item.source,
        },
      ],
    }
    await putArticle(article)
    active.value = article
    await nextTick()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '保存失败'
  } finally {
    opening.value = false
  }
}

function closeActive() {
  active.value = null
}

onMounted(() => {
  void loadFeeds()
})
</script>

<template>
  <div class="news-brief">
    <header class="news-brief__header">
      <button class="news-brief__icon" type="button" aria-label="返回" @click="active ? closeActive() : emit('back')">
        <ArrowLeft :size="20" />
      </button>
      <h1>{{ active ? '新闻阅读' : '今日新闻' }}</h1>
      <button
        v-if="!active"
        class="news-brief__icon"
        type="button"
        aria-label="刷新"
        :disabled="loading"
        @click="loadFeeds"
      >
        <RefreshCw :size="18" :class="{ 'is-spinning': loading }" />
      </button>
      <span v-else class="news-brief__spacer" />
    </header>

    <!-- 单篇阅读：摘要 + 段译 -->
    <main v-if="active" class="news-brief__reader">
      <h2 class="news-brief__title">{{ active.title }}</h2>
      <ParagraphTranslation
        :article-id="active.id"
        :content="active.content"
        :drawing-active="false"
        drawing-tool="pen"
        drawing-color="#0f172a"
        :drawing-width="2"
      />
      <ArticleSources
        v-if="active.sources?.length"
        :sources="active.sources"
        :theme="active.theme"
      />
      <a
        v-if="active.link"
        class="news-brief__external"
        :href="active.link"
        target="_blank"
        rel="noopener noreferrer"
      >
        打开原文
        <ExternalLink :size="14" />
      </a>
    </main>

    <!-- 列表 -->
    <main v-else class="news-brief__main">
      <p class="news-brief__intro">
        来自你开启的 RSS 源。点开即保存到「今日已保存」，可在下方做段译；不会用 AI 改写。
      </p>

      <div v-if="loading" class="news-brief__state">
        <Loader2 class="is-spinning" :size="28" />
        <span>正在拉取新闻…</span>
      </div>
      <div v-else-if="error" class="news-brief__state">
        <p>{{ error }}</p>
        <button type="button" @click="loadFeeds">重试</button>
      </div>
      <ul v-else class="news-brief__list">
        <li v-for="(item, idx) in items" :key="`${item.link}-${idx}`">
          <button class="news-brief__item" type="button" :disabled="opening" @click="openItem(item)">
            <span class="news-brief__outlet">{{ item.source }}</span>
            <span class="news-brief__item-title">{{ item.title }}</span>
            <span v-if="item.summary" class="news-brief__summary">{{ item.summary }}</span>
          </button>
        </li>
      </ul>
    </main>
  </div>
</template>

<style scoped>
.news-brief {
  min-height: 100vh;
  color: var(--app-font-color, #0f172a);
  padding-bottom: 2rem;
}

.news-brief__header {
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

.news-brief__header h1 {
  margin: 0;
  text-align: center;
  font-size: 1rem;
  font-weight: 700;
}

.news-brief__icon {
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

.news-brief__icon:disabled {
  opacity: 0.5;
}

.news-brief__spacer {
  width: 44px;
}

.news-brief__main,
.news-brief__reader {
  padding: 12px 16px 28px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.news-brief__intro {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--app-font-color-muted, #64748b);
}

.news-brief__state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 40px 12px;
  color: var(--app-font-color-muted, #64748b);
  font-size: 0.875rem;
}

.news-brief__state button {
  padding: 8px 16px;
  border: 0;
  border-radius: 999px;
  background: #0f172a;
  color: #fff;
  font-size: 0.8125rem;
  cursor: pointer;
}

.news-brief__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.news-brief__item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  width: 100%;
  padding: 12px;
  border: 0;
  border-radius: 12px;
  background: rgba(148, 163, 184, 0.12);
  text-align: left;
  color: inherit;
  cursor: pointer;
}

.news-brief__item:disabled {
  opacity: 0.6;
}

.news-brief__outlet {
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--app-font-color-muted, #64748b);
}

.news-brief__item-title {
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.35;
}

.news-brief__summary {
  font-size: 0.75rem;
  line-height: 1.45;
  color: var(--app-font-color-muted, #64748b);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.news-brief__title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.35;
}

.news-brief__external {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  align-self: flex-start;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--app-font-color-muted, #475569);
  text-decoration: none;
}

.is-spinning {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
