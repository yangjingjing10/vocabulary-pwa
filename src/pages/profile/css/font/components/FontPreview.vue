<script setup lang="ts">
import { SYSTEM_FONT_FAMILY, SYSTEM_FONT_LABEL } from '../types/font'

defineProps<{
  fontFamily: string
  color: string
  fontSize: number
}>()

/** 系统默认用字体栈；自定义字体需加引号 */
function previewFontFamily(family: string): string | undefined {
  if (!family || family === SYSTEM_FONT_LABEL) return SYSTEM_FONT_FAMILY
  return `'${family}', sans-serif`
}
</script>

<template>
  <section class="font-section font-section--preview">
    <h2 class="font-section__title">字体预览</h2>
    <div
      class="font-preview"
      :style="{
        fontFamily: previewFontFamily(fontFamily),
        color,
        fontSize: `${fontSize}px`,
      }"
    >
      <p class="font-preview__sample">
        {{ fontFamily || SYSTEM_FONT_LABEL }}
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
