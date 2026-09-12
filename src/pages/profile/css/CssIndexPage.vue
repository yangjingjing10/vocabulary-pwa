<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

import '@/styles/pages/profile/css-pages.css'

const emit = defineEmits<{
  back: []
  navigateToWallpaper: []
  navigateToFont: []
}>()

interface CssCategory {
  id: string
  label: string
  description: string
  enabled: boolean
}

const categories: CssCategory[] = [
  { id: 'wallpaper', label: '壁纸', description: '自定义背景图片与渐变色', enabled: true },
  { id: 'global', label: '全局样式', description: '调整布局、间距与配色方案', enabled: false },
  { id: 'font', label: '字体', description: '自定义字体系列与排版', enabled: true }
]

function handleCategoryClick(categoryId: string) {
  if (categoryId === 'wallpaper') {
    emit('navigateToWallpaper')
  } else if (categoryId === 'font') {
    emit('navigateToFont')
  }
}
</script>

<template>
  <div class="css-index-page">
    <header class="css-index-page__header">
      <button class="css-index-page__back" type="button" aria-label="返回" @click="emit('back')">
        <ChevronLeft :size="20" :stroke-width="2.5" />
      </button>
      <h1>自定义 CSS</h1>
      <div class="css-index-page__spacer"></div>
    </header>

    <main class="css-index-page__content">
      <section class="css-category-list">
        <button
          v-for="category in categories"
          :key="category.id"
          type="button"
          class="css-category-item"
          :class="{ 'css-category-item--disabled': !category.enabled }"
          :disabled="!category.enabled"
          @click="handleCategoryClick(category.id)"
        >
          <div class="css-category-item__content">
            <h3>{{ category.label }}</h3>
            <p>{{ category.description }}</p>
          </div>
          <ChevronRight :size="20" :stroke-width="2" class="css-category-item__arrow" />
        </button>
      </section>
    </main>
  </div>
</template>
