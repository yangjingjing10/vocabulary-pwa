<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next'

const emit = defineEmits<{
  back: []
  navigateToArticle: []
  navigateToQuiz: []
}>()
</script>

<template>
  <div class="prompt-config-index-page">
    <header class="prompt-index-header">
      <button type="button" class="prompt-index-back" @click="emit('back')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      </button>
      <h1>AI 提示词配置</h1>
    </header>

    <main class="prompt-index-content">
      <div class="prompt-index-list">
        <button
          type="button"
          class="prompt-index-item"
          @click="emit('navigateToArticle')"
        >
          <div class="prompt-index-item__icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <line x1="10" y1="9" x2="8" y2="9" />
            </svg>
          </div>
          <div class="prompt-index-item__content">
            <h3>AI 生成文章提示词</h3>
            <p>配置文章生成的提示词</p>
          </div>
          <ChevronRight :size="20" class="prompt-index-item__arrow" />
        </button>

        <button
          type="button"
          class="prompt-index-item"
          @click="emit('navigateToQuiz')"
        >
          <div class="prompt-index-item__icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div class="prompt-index-item__content">
            <h3>选择题提示词配置</h3>
            <p>配置选择题生成的提示词</p>
          </div>
          <ChevronRight :size="20" class="prompt-index-item__arrow" />
        </button>
      </div>
    </main>
  </div>
</template>

<style scoped>
.prompt-config-index-page {
  min-height: 100vh;
  background: transparent;
  padding-bottom: 2rem;
  color: var(--app-font-color, #0f172a);
}

.prompt-index-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: transparent;
  border-bottom: 1px solid rgba(148, 163, 184, 0.35);
  padding: 1rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.prompt-index-back {
  background: none;
  border: none;
  padding: 0.5rem;
  cursor: pointer;
  color: var(--app-font-color-muted, #475569);
  transition: color 0.2s, background 0.2s;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.prompt-index-back:hover {
  background: rgba(148, 163, 184, 0.18);
  color: var(--app-font-color, #0f172a);
}

.prompt-index-header h1 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--app-font-color, #0f172a);
  margin: 0;
}

.prompt-index-content {
  max-width: 800px;
  margin: 0 auto;
  padding: 0.5rem 1.5rem 2rem;
}

.prompt-index-list {
  display: flex;
  flex-direction: column;
}

.prompt-index-item {
  background: transparent;
  border: 0;
  border-bottom: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 0;
  padding: 1.15rem 0;
  display: flex;
  align-items: center;
  gap: 1rem;
  cursor: pointer;
  transition: background 0.15s ease;
  text-align: left;
  width: 100%;
}

.prompt-index-item:last-child {
  border-bottom: 0;
}

.prompt-index-item:hover {
  background: rgba(148, 163, 184, 0.1);
}

.prompt-index-item__icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 0.65rem;
  background: rgba(148, 163, 184, 0.22);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--app-font-color, #334155);
}

.prompt-index-item__content {
  flex: 1;
  min-width: 0;
}

.prompt-index-item__content h3 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--app-font-color, #0f172a);
  margin: 0 0 0.25rem 0;
}

.prompt-index-item__content p {
  font-size: 0.875rem;
  color: var(--app-font-color-muted, #64748b);
  margin: 0;
}

.prompt-index-item__arrow {
  flex-shrink: 0;
  color: var(--app-font-color-soft, #94a3b8);
  transition: transform 0.2s, color 0.2s;
}

.prompt-index-item:hover .prompt-index-item__arrow {
  transform: translateX(4px);
  color: var(--app-font-color-muted, #64748b);
}
</style>
