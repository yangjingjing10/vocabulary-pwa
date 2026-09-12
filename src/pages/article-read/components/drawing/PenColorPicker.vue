<script setup lang="ts">
import { DRAWING_COLORS } from '../../types/drawing'

interface Props {
  modelValue: string
}

defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <div class="pen-color-picker" role="listbox" aria-label="笔触颜色">
    <button
      v-for="c in DRAWING_COLORS"
      :key="c"
      type="button"
      class="pen-color-picker__swatch"
      :class="{ 'is-active': modelValue === c }"
      :style="{ background: c }"
      :title="c"
      role="option"
      :aria-selected="modelValue === c"
      @click="emit('update:modelValue', c)"
    />
  </div>
</template>

<style scoped>
.pen-color-picker {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pen-color-picker__swatch {
  width: 22px;
  height: 22px;
  border: 2px solid transparent;
  border-radius: 999px;
  cursor: pointer;
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.12);
  transition: transform 0.12s ease, border-color 0.12s ease;
}

.pen-color-picker__swatch:hover {
  transform: scale(1.08);
}

.pen-color-picker__swatch.is-active {
  border-color: var(--app-font-color, #0f172a);
  transform: scale(1.1);
}
</style>
