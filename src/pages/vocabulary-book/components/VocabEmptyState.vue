<script setup lang="ts">
import { BookOpen } from 'lucide-vue-next'
</script>

<template>
  <div class="vocab-empty">
    <BookOpen :size="48" />
    <h3>No words yet</h3>
    <p>Import words via camera or file upload to start building your vocabulary</p>
  </div>
</template>
