<script setup lang="ts">
import { MAX_FONT_SIZE, MIN_FONT_SIZE } from '../types/font'

defineProps<{
  modelValue: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

function onInput(event: Event) {
  const value = Number((event.target as HTMLInputElement).value)
  emit('update:modelValue', value)
}
</script>

<template>
  <section class="font-section">
    <div class="font-size-setting">
      <div class="font-size-setting__left">
        <h2 class="font-section__title">字体大小</h2>
        <p class="font-section__desc font-section__desc--tight">
          调整全局字号，应用到全部页面文字
        </p>
      </div>
      <span class="font-size-setting__value">{{ modelValue }}px</span>
    </div>

    <div class="font-size-row">
      <span class="font-size-row__label font-size-row__label--sm">A</span>
      <input
        type="range"
        class="font-range"
        :min="MIN_FONT_SIZE"
        :max="MAX_FONT_SIZE"
        step="1"
        :value="modelValue"
        @input="onInput"
      />
      <span class="font-size-row__label font-size-row__label--lg">A</span>
    </div>
  </section>
</template>
