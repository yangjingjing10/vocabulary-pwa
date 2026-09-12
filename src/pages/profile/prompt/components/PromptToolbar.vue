<script setup lang="ts">
import { Plus, Upload } from 'lucide-vue-next'

const emit = defineEmits<{
  create: []
  upload: [event: Event]
}>()
</script>

<template>
  <section class="prompt-toolbar">
    <button class="prompt-toolbar-btn prompt-toolbar-btn--primary" type="button" @click="emit('create')">
      <Plus :size="15" />
      <span>New Config</span>
    </button>
    <label class="prompt-toolbar-btn">
      <Upload :size="15" />
      <span>Upload File</span>
      <input type="file" accept=".txt,.md" hidden @change="emit('upload', $event)" />
    </label>
  </section>
</template>
