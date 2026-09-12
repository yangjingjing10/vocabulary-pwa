<script setup lang="ts">
defineProps<{
  fontFamily: string
  color: string
}>()
</script>

<template>
  <section class="font-section font-section--preview">
    <h2 class="font-section__title">字体预览</h2>
    <div
      class="font-preview"
      :style="{
        fontFamily: fontFamily ? `'${fontFamily}', sans-serif` : undefined,
        color
      }"
    >
      <p class="font-preview__sample">
        {{ fontFamily || '系统默认字体' }}
      </p>
      <p class="font-preview__pangram">
        The quick brown fox jumps over the lazy dog.
      </p>
      <p class="font-preview__pangram">
        永和九年，岁在癸丑。ABCDEFG 1234567890
      </p>
    </div>
  </section>
</template>
