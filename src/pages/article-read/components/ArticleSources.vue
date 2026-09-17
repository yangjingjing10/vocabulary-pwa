<script setup lang="ts">
import { ref } from 'vue'
import { ChevronDown, ExternalLink } from 'lucide-vue-next'

import type { ArticleSourceRef } from '@/db/schema/database'

defineProps<{
  sources: ArticleSourceRef[]
  theme?: string
}>()

const expanded = ref(false)
</script>

<template>
  <aside v-if="sources?.length || theme" class="article-sources">
    <button
      class="article-sources__toggle"
      type="button"
      :aria-expanded="expanded"
      @click="expanded = !expanded"
    >
      <span class="article-sources__label">来源</span>
      <span v-if="theme" class="article-sources__theme">{{ theme }}</span>
      <span class="article-sources__count">{{ sources?.length || 0 }}</span>
      <ChevronDown
        class="article-sources__chevron"
        :class="{ 'is-open': expanded }"
        :size="14"
      />
    </button>
    <ul v-if="expanded && sources?.length" class="article-sources__list">
      <li v-for="(src, idx) in sources" :key="`${src.link}-${idx}`">
        <a
          class="article-sources__link"
          :href="src.link"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span class="article-sources__title">{{ src.title }}</span>
          <span class="article-sources__meta">
            <span v-if="src.outlet">{{ src.outlet }}</span>
            <ExternalLink :size="12" aria-hidden="true" />
          </span>
        </a>
      </li>
    </ul>
  </aside>
</template>

<style scoped>
.article-sources {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px dashed color-mix(in srgb, var(--app-font-color-soft, #94a3b8) 50%, transparent);
}

.article-sources__toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.article-sources__label {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--app-font-color-soft, #94a3b8);
}

.article-sources__theme {
  flex: 1;
  min-width: 0;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--app-font-color-muted, #64748b);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.article-sources__count {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--app-font-color-soft, #94a3b8);
}

.article-sources__chevron {
  transition: transform 0.2s ease;
  color: var(--app-font-color-soft, #94a3b8);
}

.article-sources__chevron.is-open {
  transform: rotate(180deg);
}

.article-sources__list {
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.article-sources__link {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(148, 163, 184, 0.12);
  color: inherit;
  text-decoration: none;
}

.article-sources__link:active {
  opacity: 0.85;
}

.article-sources__title {
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.article-sources__meta {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.6875rem;
  color: var(--app-font-color-muted, #64748b);
}
</style>
