<script setup lang="ts">
import { ArrowLeft } from 'lucide-vue-next'

const emit = defineEmits<{
  back: []
}>()
</script>

<template>
  <header class="prompt-header">
    <div class="prompt-header__title">
      <button class="prompt-icon-button" type="button" @click="emit('back')">
        <ArrowLeft :size="17" />
      </button>
      <div>
        <h1>Prompt Configuration</h1>
        <p>Manage multiple prompt templates</p>
      </div>
    </div>
  </header>
</template>
