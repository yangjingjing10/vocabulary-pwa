<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next'

defineProps<{
  expanded?: boolean
}>()

defineEmits<{
  click: [event: MouseEvent]
}>()
</script>

<template>
  <button
    type="button"
    class="inline-translation-toggle"
    :class="{ 'is-expanded': expanded }"
    title="翻译本段"
    @click.stop="$emit('click', $event)"
  >
    <ChevronDown :size="14" :stroke-width="2.5" />
  </button>
</template>

<style scoped>
.inline-translation-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-left: 4px;
  padding: 0;
  vertical-align: middle;
  position: relative;
  top: -1px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--app-font-color-soft, #d1d1d6);
  cursor: pointer;
  transition: color 0.2s ease, background 0.2s ease, transform 0.3s cubic-bezier(0.25, 1, 0.5, 1);
}

.inline-translation-toggle:hover {
  color: var(--app-font-color-muted, #86868b);
  background: rgba(0, 0, 0, 0.04);
}

.inline-translation-toggle.is-expanded {
  transform: rotate(180deg);
  color: var(--app-font-color-muted, #86868b);
  background: rgba(0, 0, 0, 0.04);
}
</style>
