<script setup lang="ts">
interface Props {
  current: number
  total: number
  answeredCount: number
}

defineProps<Props>()
</script>

<template>
  <div class="choice-progress">
    <div class="choice-progress__info">
      <span class="choice-progress__text">第 {{ current }} / {{ total }} 题</span>
      <span class="choice-progress__answered">已答 {{ answeredCount }} 题</span>
    </div>
    <div class="choice-progress__bar">
      <div
        class="choice-progress__fill"
        :style="{ width: `${(current / total) * 100}%` }"
      />
    </div>
  </div>
</template>
