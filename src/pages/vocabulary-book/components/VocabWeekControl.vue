<script setup lang="ts">
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-vue-next'

interface Props {
  weekLabel: string
  canGoPrev: boolean
  canGoNext: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  prev: []
  next: []
  openCalendar: []
}>()
</script>

<template>
  <div class="vocab-week-control">
    <button type="button" :disabled="!canGoPrev" @click="emit('prev')">
      <ChevronLeft :size="16" />
    </button>
    <div class="vocab-week-label" @click="emit('openCalendar')">
      <Calendar :size="14" />
      <span>{{ weekLabel }}</span>
      <ChevronDown :size="12" />
    </div>
    <button type="button" :disabled="!canGoNext" @click="emit('next')">
      <ChevronRight :size="16" />
    </button>
  </div>
</template>
