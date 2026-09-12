<script setup lang="ts">
import { FileText } from 'lucide-vue-next'
import type { PromptConfig } from '@/db/schema/database'

defineProps<{
  configs: PromptConfig[]
  selectedConfigId: string | null
}>()

const emit = defineEmits<{
  select: [id: string]
}>()

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  
  return date.toLocaleDateString()
}
</script>

<template>
  <aside class="prompt-list">
    <div v-if="configs.length === 0" class="prompt-list-empty">
      <FileText :size="32" />
      <p>No configurations yet</p>
      <span>Create your first prompt config</span>
    </div>
    
    <button
      v-for="config in configs"
      :key="config.id"
      class="prompt-list-item"
      :class="{ 'is-selected': selectedConfigId === config.id }"
      type="button"
      @click="emit('select', config.id)"
    >
      <div class="prompt-list-item__header">
        <h3>{{ config.name }}</h3>
        <span v-if="config.isActive" class="prompt-list-item__badge">Active</span>
      </div>
      <p class="prompt-list-item__preview">
        {{ config.content ? config.content.substring(0, 60) + '...' : 'Empty' }}
      </p>
      <span class="prompt-list-item__time">{{ formatDate(config.updatedAt) }}</span>
    </button>
  </aside>
</template>
