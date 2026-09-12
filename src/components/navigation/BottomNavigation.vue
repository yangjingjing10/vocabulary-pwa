<script setup lang="ts">
import { GraduationCap, House } from 'lucide-vue-next'

import '@/styles/components/bottom-navigation.css'

type NavigationTab = 'study' | 'home'

defineProps<{
  activeTab: NavigationTab
}>()

const emit = defineEmits<{
  navigate: [tab: NavigationTab]
}>()

const tabs = [
  { id: 'study' as const, label: '学习', icon: GraduationCap },
  { id: 'home' as const, label: '主页', icon: House },
]
</script>

<template>
  <nav class="bottom-navigation" aria-label="主导航">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      type="button"
      class="bottom-navigation__tab"
      :class="{ 'is-active': activeTab === tab.id }"
      :aria-label="tab.label"
      @click="emit('navigate', tab.id)"
    >
      <component
        :is="tab.icon"
        :size="22"
        :stroke-width="activeTab === tab.id ? 2.4 : 2"
        aria-hidden="true"
      />
    </button>
  </nav>
</template>
