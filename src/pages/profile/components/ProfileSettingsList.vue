<script setup lang="ts">
import { ChevronRight, Database, Newspaper, Smartphone, WandSparkles } from 'lucide-vue-next'

interface SettingItem {
  type: 'data' | 'prompt' | 'rss' | 'pwa'
  title: string
  description: string
  badge: string
  badgeTone: 'blue' | 'amber' | 'slate'
  icon: typeof Database
  iconTone: 'blue' | 'emerald' | 'slate'
}

defineEmits<{
  openSetting: [type: SettingItem['type']]
}>()

const settings: SettingItem[] = [
  {
    type: 'data',
    title: '数据配置与备份恢复',
    description: '词库 JSON 导出备份、恢复与本地缓存清理',
    badge: '本地',
    badgeTone: 'slate',
    icon: Database,
    iconTone: 'slate'
  },
  {
    type: 'prompt',
    title: 'AI 提示词 & 语境风格',
    description: '配置 AI 自动撰写英文短文时的难度与题材控制',
    badge: '专四/外刊',
    badgeTone: 'slate',
    icon: WandSparkles,
    iconTone: 'slate'
  },
  {
    type: 'rss',
    title: '新闻源 RSS',
    description: '文章生成用的真实新闻标题源（BBC / NPR / Guardian）',
    badge: '预置',
    badgeTone: 'slate',
    icon: Newspaper,
    iconTone: 'emerald'
  },
  {
    type: 'pwa',
    title: 'PWA 离线支持与关于',
    description: '离线缓存 Service Worker 就绪，可安装至桌面',
    badge: 'v1.0.0',
    badgeTone: 'slate',
    icon: Smartphone,
    iconTone: 'slate'
  }
]
</script>

<template>
  <div class="profile-settings">
    <button
      v-for="setting in settings"
      :key="setting.type"
      class="profile-setting"
      type="button"
      @click="$emit('openSetting', setting.type)"
    >
      <span class="profile-setting__icon" :class="`profile-setting__icon--${setting.iconTone}`" aria-hidden="true">
        <component :is="setting.icon" :size="17" :stroke-width="2" />
      </span>
      <span class="profile-setting__copy">
        <span class="profile-setting__title-row">
          <strong>{{ setting.title }}</strong>
          <span class="profile-setting__badge" :class="`profile-setting__badge--${setting.badgeTone}`">{{ setting.badge }}</span>
        </span>
        <span class="profile-setting__description">{{ setting.description }}</span>
      </span>
      <ChevronRight class="profile-setting__arrow" :size="16" :stroke-width="2" aria-hidden="true" />
    </button>
  </div>
</template>
