<script setup lang="ts">
import { ArrowLeft, Plus, Search } from 'lucide-vue-next'

interface Props {
  totalWords: number
  showSearch: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  back: []
  toggleSearch: []
  openImport: []
}>()
</script>

<template>
  <header class="vocab-header">
    <button class="vocab-icon-button" type="button" aria-label="Back" @click="emit('back')">
      <ArrowLeft :size="18" />
    </button>
    <div class="vocab-header__title">
      <h1>Vocabulary Book</h1>
      <p v-if="totalWords > 0">{{ totalWords }} words this week</p>
      <p v-else>No words yet</p>
    </div>
    <div class="vocab-header__actions">
      <button
        class="vocab-icon-button"
        type="button"
        aria-label="Search"
        @click="emit('toggleSearch')"
      >
        <Search :size="16" />
      </button>
      <button
        class="vocab-icon-button"
        type="button"
        aria-label="Import words"
        @click="emit('openImport')"
      >
        <Plus :size="16" :stroke-width="2.5" />
      </button>
    </div>
  </header>
</template>
