<script setup lang="ts">
interface Props {
  active?: boolean
  label: string
  title?: string
}

defineProps<Props>()

defineEmits<{
  click: []
}>()
</script>

<template>
  <button
    type="button"
    class="drawing-tool-button"
    :class="{ 'is-active': active }"
    :title="title || label"
    :aria-label="label"
    @click="$emit('click')"
  >
    <slot />
  </button>
</template>

<style scoped>
.drawing-tool-button {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #fff;
  color: var(--app-font-color-muted, #475569);
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.drawing-tool-button:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.drawing-tool-button.is-active {
  background: #0f172a;
  border-color: var(--app-font-color, #0f172a);
  color: #fff;
}
</style>
