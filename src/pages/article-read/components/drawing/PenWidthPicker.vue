<script setup lang="ts">
import { DRAWING_WIDTHS } from '../../types/drawing'

interface Props {
  modelValue: number
  color?: string
}

defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()
</script>

<template>
  <div class="pen-width-picker" role="listbox" aria-label="笔触粗细">
    <button
      v-for="w in DRAWING_WIDTHS"
      :key="w"
      type="button"
      class="pen-width-picker__item"
      :class="{ 'is-active': modelValue === w }"
      :title="`${w}px`"
      role="option"
      :aria-selected="modelValue === w"
      @click="emit('update:modelValue', w)"
    >
      <span
        class="pen-width-picker__dot"
        :style="{
          width: `${Math.max(6, w)}px`,
          height: `${Math.max(6, w)}px`,
          background: color || '#0f172a'
        }"
      />
    </button>
  </div>
</template>

<style scoped>
.pen-width-picker {
  display: flex;
  align-items: center;
  gap: 6px;
}

.pen-width-picker__item {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
  transition: border-color 0.12s ease, background 0.12s ease;
}

.pen-width-picker__item:hover {
  background: #f8fafc;
}

.pen-width-picker__item.is-active {
  border-color: var(--app-font-color, #0f172a);
  background: #f1f5f9;
}

.pen-width-picker__dot {
  display: block;
  border-radius: 999px;
}
</style>
