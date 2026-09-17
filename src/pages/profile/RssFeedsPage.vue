<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ArrowLeft, RefreshCw } from 'lucide-vue-next'

import type { RssFeedConfig } from '@/constants/rss-feeds'
import {
  fetchRssXml,
  loadRssFeedConfigs,
  parseRssXml,
  saveRssFeedConfigs,
} from '@/services/rss.service'

const emit = defineEmits<{
  back: []
}>()

const feeds = ref<RssFeedConfig[]>([])
const testingId = ref<string | null>(null)
const toast = ref('')

onMounted(() => {
  feeds.value = loadRssFeedConfigs()
})

function persist() {
  saveRssFeedConfigs(feeds.value)
}

function toggleFeed(id: string) {
  const target = feeds.value.find((f) => f.id === id)
  if (!target) return
  target.enabled = !target.enabled
  persist()
}

function showToast(message: string) {
  toast.value = message
  window.setTimeout(() => {
    if (toast.value === message) toast.value = ''
  }, 2800)
}

async function testFeed(feed: RssFeedConfig) {
  if (testingId.value) return
  testingId.value = feed.id
  try {
    const xml = await fetchRssXml(feed.url)
    const items = parseRssXml(xml, feed.name)
    if (!items.length) {
      showToast(`${feed.name}：已连通，但没有条目`)
    } else {
      showToast(`${feed.name}：OK，最新「${items[0].title.slice(0, 36)}」`)
    }
  } catch (error) {
    showToast(`${feed.name}：失败 — ${error instanceof Error ? error.message : '未知错误'}`)
  } finally {
    testingId.value = null
  }
}
</script>

<template>
  <div class="rss-feeds-page">
    <header class="rss-feeds-page__header">
      <button class="rss-feeds-page__back" type="button" aria-label="返回" @click="emit('back')">
        <ArrowLeft :size="20" />
      </button>
      <h1>新闻源 RSS</h1>
    </header>

    <main class="rss-feeds-page__main">
      <p class="rss-feeds-page__intro">
        生成文章时会拉取已开启源的最新标题与摘要，让 AI 按主题挑选单词并写成多篇新闻体短文（不用搜索
        API）。关闭某源即不再使用。
      </p>

      <ul class="rss-feeds-page__list">
        <li v-for="feed in feeds" :key="feed.id" class="rss-feeds-page__item">
          <div class="rss-feeds-page__item-top">
            <label class="rss-feeds-page__toggle">
              <input
                type="checkbox"
                :checked="feed.enabled"
                @change="toggleFeed(feed.id)"
              >
              <span class="rss-feeds-page__name">{{ feed.name }}</span>
            </label>
            <button
              class="rss-feeds-page__test"
              type="button"
              :disabled="testingId === feed.id"
              @click="testFeed(feed)"
            >
              <RefreshCw
                :size="14"
                :class="{ 'is-spinning': testingId === feed.id }"
              />
              测试
            </button>
          </div>
          <p class="rss-feeds-page__url">{{ feed.url }}</p>
        </li>
      </ul>

      <p v-if="toast" class="rss-feeds-page__toast">{{ toast }}</p>
    </main>
  </div>
</template>

<style scoped>
.rss-feeds-page {
  min-height: 100vh;
  color: var(--app-font-color, #0f172a);
  padding-bottom: 2rem;
}

.rss-feeds-page__header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: grid;
  grid-template-columns: 44px 1fr 44px;
  align-items: center;
  min-height: 56px;
  padding: 8px;
  padding-top: max(8px, env(safe-area-inset-top));
  background: color-mix(in srgb, #f8fafc 86%, transparent);
  backdrop-filter: blur(8px);
}

.rss-feeds-page__header h1 {
  margin: 0;
  text-align: center;
  font-size: 1rem;
  font-weight: 700;
}

.rss-feeds-page__back {
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

.rss-feeds-page__main {
  padding: 12px 16px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.rss-feeds-page__intro {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.55;
  color: var(--app-font-color-muted, #64748b);
}

.rss-feeds-page__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rss-feeds-page__item {
  padding: 14px 14px;
  border-radius: 14px;
  background: rgba(148, 163, 184, 0.12);
}

.rss-feeds-page__item-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.rss-feeds-page__toggle {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  min-width: 0;
}

.rss-feeds-page__name {
  font-size: 0.9375rem;
  font-weight: 700;
}

.rss-feeds-page__url {
  margin: 8px 0 0;
  font-size: 0.6875rem;
  line-height: 1.4;
  word-break: break-all;
  color: var(--app-font-color-soft, #94a3b8);
}

.rss-feeds-page__test {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  padding: 6px 10px;
  border: 0;
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.06);
  color: var(--app-font-color-muted, #475569);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
}

.rss-feeds-page__test:disabled {
  opacity: 0.6;
  cursor: default;
}

.rss-feeds-page__toast {
  margin: 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.08);
  font-size: 0.8125rem;
  line-height: 1.45;
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
