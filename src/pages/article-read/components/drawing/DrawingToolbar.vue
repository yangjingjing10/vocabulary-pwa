<script setup lang="ts">
import type { DrawingTool } from '../../types/drawing'
import ToolModeButton from './ToolModeButton.vue'
import PenColorPicker from './PenColorPicker.vue'
import PenWidthPicker from './PenWidthPicker.vue'
import { Pencil, Eraser, MousePointer2, X } from 'lucide-vue-next'

interface Props {
  tool: DrawingTool
  color: string
  width: number
}

defineProps<Props>()

const emit = defineEmits<{
  'update:tool': [value: DrawingTool]
  'update:color': [value: string]
  'update:width': [value: number]
  close: []
}>()
</script>

<template>
  <div class="drawing-toolbar" role="toolbar" aria-label="涂鸦工具栏">
    <div class="drawing-toolbar__modes">
      <ToolModeButton
        label="铅笔"
        :active="tool === 'pen'"
        @click="emit('update:tool', 'pen')"
      >
        <Pencil :size="18" :stroke-width="2" />
      </ToolModeButton>

      <ToolModeButton
        label="橡皮"
        :active="tool === 'eraser'"
        @click="emit('update:tool', 'eraser')"
      >
        <Eraser :size="18" :stroke-width="2" />
      </ToolModeButton>

      <ToolModeButton
        label="鼠标"
        title="滚动翻页"
        :active="tool === 'pan'"
        @click="emit('update:tool', 'pan')"
      >
        <MousePointer2 :size="18" :stroke-width="2" />
      </ToolModeButton>
    </div>

    <div v-if="tool === 'pen'" class="drawing-toolbar__options">
      <PenColorPicker
        :model-value="color"
        @update:model-value="emit('update:color', $event)"
      />
      <span class="drawing-toolbar__divider" />
      <PenWidthPicker
        :model-value="width"
        :color="color"
        @update:model-value="emit('update:width', $event)"
      />
    </div>

    <button
      type="button"
      class="drawing-toolbar__close"
      title="退出批注"
      @click="emit('close')"
    >
      <X :size="16" />
    </button>
  </div>
</template>

<style scoped>
.drawing-toolbar {
  position: fixed;
  left: 50%;
  bottom: max(16px, env(safe-area-inset-bottom));
  z-index: 40;
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: calc(100vw - 24px);
  padding: 10px 12px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.12);
  backdrop-filter: blur(12px);
  transform: translateX(-50%);
}

.drawing-toolbar__modes {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.drawing-toolbar__options {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  overflow-x: auto;
}

.drawing-toolbar__divider {
  width: 1px;
  height: 22px;
  background: #e2e8f0;
  flex-shrink: 0;
}

.drawing-toolbar__close {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  margin-left: 4px;
  border: 0;
  border-radius: 999px;
  background: #f1f5f9;
  color: var(--app-font-color-muted, #64748b);
  cursor: pointer;
  flex-shrink: 0;
}

.drawing-toolbar__close:hover {
  background: #e2e8f0;
  color: var(--app-font-color, #0f172a);
}

@media (max-width: 480px) {
  .drawing-toolbar {
    flex-wrap: wrap;
    justify-content: center;
    width: calc(100vw - 24px);
  }
}
</style>
