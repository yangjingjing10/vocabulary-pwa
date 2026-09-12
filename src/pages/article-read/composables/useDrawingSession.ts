import { ref, computed } from 'vue'
import type { DrawingTool } from '../types/drawing'
import {
  DEFAULT_DRAWING_COLOR,
  DEFAULT_DRAWING_WIDTH
} from '../types/drawing'

/**
 * 页面级涂鸦会话状态（工具栏与各文章画布共享）
 */
export function useDrawingSession() {
  const isActive = ref(false)
  const tool = ref<DrawingTool>('pen')
  const color = ref(DEFAULT_DRAWING_COLOR)
  const width = ref(DEFAULT_DRAWING_WIDTH)

  const isIntercepting = computed(
    () => isActive.value && (tool.value === 'pen' || tool.value === 'eraser')
  )

  function toggle() {
    isActive.value = !isActive.value
    if (isActive.value) {
      tool.value = 'pen'
    }
  }

  function exit() {
    isActive.value = false
  }

  function setTool(next: DrawingTool) {
    tool.value = next
  }

  function setColor(next: string) {
    color.value = next
    tool.value = 'pen'
  }

  function setWidth(next: number) {
    width.value = next
    tool.value = 'pen'
  }

  return {
    isActive,
    tool,
    color,
    width,
    isIntercepting,
    toggle,
    exit,
    setTool,
    setColor,
    setWidth
  }
}
