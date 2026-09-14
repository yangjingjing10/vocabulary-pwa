import { onBeforeUnmount, ref } from 'vue'

const LONG_PRESS_MS = 520
const MOVE_CANCEL_PX = 12

export function useArticleLongPress(isDisabled: () => boolean) {
  const pendingId = ref<string | null>(null)
  let timer: ReturnType<typeof setTimeout> | null = null
  let startX = 0
  let startY = 0
  let armedId: string | null = null

  function clearTimer() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    armedId = null
  }

  function requestDelete(articleId: string) {
    clearTimer()
    pendingId.value = articleId
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(12)
    }
  }

  function onPointerDown(articleId: string, event: PointerEvent) {
    if (isDisabled()) return
    if (event.pointerType === 'mouse' && event.button !== 0) return

    clearTimer()
    startX = event.clientX
    startY = event.clientY
    armedId = articleId
    timer = setTimeout(() => {
      requestDelete(articleId)
    }, LONG_PRESS_MS)
  }

  function onPointerMove(event: PointerEvent) {
    if (!timer || !armedId) return
    const dx = event.clientX - startX
    const dy = event.clientY - startY
    if (dx * dx + dy * dy > MOVE_CANCEL_PX * MOVE_CANCEL_PX) {
      clearTimer()
    }
  }

  function onPointerUp() {
    clearTimer()
  }

  function onContextMenu(articleId: string, event: Event) {
    event.preventDefault()
    if (isDisabled()) return
    requestDelete(articleId)
  }

  function close() {
    pendingId.value = null
  }

  onBeforeUnmount(clearTimer)

  return {
    pendingId,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onContextMenu,
    close,
  }
}
