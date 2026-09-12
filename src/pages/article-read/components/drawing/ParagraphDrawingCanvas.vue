<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch, nextTick } from 'vue'
import type { DrawingTool, DrawingStroke } from '../../types/drawing'
import {
  useInjectedArticleDrawing,
  strokesForParagraph
} from '../../composables/useArticleDrawingContext'
import { paintStrokes } from '../../utils/drawStrokes'
import { findHitStrokeId } from '../../utils/strokeHitTest'

interface Props {
  paragraphIndex: number
  isSessionActive: boolean
  tool: DrawingTool
  color: string
  width: number
}

const props = defineProps<Props>()

const rootRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

const { strokes, addStroke, removeStroke } = useInjectedArticleDrawing()

const localStrokes = computed(() =>
  strokesForParagraph(strokes, props.paragraphIndex)
)

const intercept = computed(
  () => props.isSessionActive && (props.tool === 'pen' || props.tool === 'eraser')
)

let drawing = false
let currentStroke: DrawingStroke | null = null
let erasedIds = new Set<string>()
let resizeObserver: ResizeObserver | null = null

function getCtx() {
  return canvasRef.value?.getContext('2d') ?? null
}

function syncCanvasSize() {
  const root = rootRef.value
  const canvas = canvasRef.value
  if (!root || !canvas) return

  const rect = root.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  const cssW = Math.max(1, Math.round(rect.width))
  const cssH = Math.max(1, Math.round(rect.height))

  canvas.width = Math.round(cssW * dpr)
  canvas.height = Math.round(cssH * dpr)
  canvas.style.width = `${cssW}px`
  canvas.style.height = `${cssH}px`

  const ctx = getCtx()
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  redraw()
}

function redraw() {
  const canvas = canvasRef.value
  const ctx = getCtx()
  if (!canvas || !ctx) return

  const cssW = canvas.clientWidth
  const cssH = canvas.clientHeight
  const base = localStrokes.value
  const all = currentStroke ? [...base, currentStroke] : base
  paintStrokes(ctx, all, cssW, cssH)
}

function toNormalizedPoint(event: PointerEvent) {
  const canvas = canvasRef.value
  if (!canvas) return null
  const rect = canvas.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return null
  return {
    x: (event.clientX - rect.left) / rect.width,
    y: (event.clientY - rect.top) / rect.height
  }
}

function eraseAt(event: PointerEvent) {
  const canvas = canvasRef.value
  if (!canvas) return
  const point = toNormalizedPoint(event)
  if (!point) return

  const px = 12 + props.width / 2
  const threshold = px / ((canvas.clientWidth + canvas.clientHeight) / 2)

  const hitId = findHitStrokeId(localStrokes.value, point, threshold)
  if (hitId && !erasedIds.has(hitId)) {
    erasedIds.add(hitId)
    removeStroke(hitId)
    redraw()
  }
}

function onPointerDown(event: PointerEvent) {
  if (!intercept.value) return
  const canvas = canvasRef.value
  if (!canvas) return

  canvas.setPointerCapture(event.pointerId)
  drawing = true
  erasedIds = new Set()

  if (props.tool === 'eraser') {
    eraseAt(event)
    return
  }

  const point = toNormalizedPoint(event)
  if (!point) return

  currentStroke = {
    id: `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    paragraphIndex: props.paragraphIndex,
    color: props.color,
    width: props.width,
    points: [point],
    createdAt: Date.now()
  }
  redraw()
}

function onPointerMove(event: PointerEvent) {
  if (!drawing || !intercept.value) return

  if (props.tool === 'eraser') {
    eraseAt(event)
    return
  }

  if (!currentStroke) return
  const point = toNormalizedPoint(event)
  if (!point) return

  const last = currentStroke.points[currentStroke.points.length - 1]
  const dx = point.x - last.x
  const dy = point.y - last.y
  if (dx * dx + dy * dy < 0.00000025) return

  currentStroke.points.push(point)
  redraw()
}

function onPointerUp(event: PointerEvent) {
  if (!drawing) return
  drawing = false

  const canvas = canvasRef.value
  if (canvas?.hasPointerCapture(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId)
  }

  if (props.tool === 'pen' && currentStroke && currentStroke.points.length > 0) {
    addStroke(currentStroke)
  }
  currentStroke = null
  erasedIds = new Set()
  redraw()
}

onMounted(async () => {
  await nextTick()
  syncCanvasSize()

  if (rootRef.value) {
    resizeObserver = new ResizeObserver(() => {
      syncCanvasSize()
    })
    resizeObserver.observe(rootRef.value)
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})

watch(localStrokes, () => redraw(), { deep: true })

watch(
  () => [props.isSessionActive, props.tool] as const,
  () => {
    if (!intercept.value) {
      drawing = false
      currentStroke = null
    }
  }
)
</script>

<template>
  <div
    ref="rootRef"
    class="paragraph-drawing-canvas"
    :class="{
      'is-intercepting': intercept,
      'is-eraser': intercept && tool === 'eraser',
      'is-pen': intercept && tool === 'pen'
    }"
  >
    <canvas
      ref="canvasRef"
      class="paragraph-drawing-canvas__canvas"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    />
  </div>
</template>

<style scoped>
.paragraph-drawing-canvas {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
}

.paragraph-drawing-canvas.is-intercepting {
  pointer-events: auto;
  touch-action: none;
}

.paragraph-drawing-canvas.is-pen {
  cursor: crosshair;
}

.paragraph-drawing-canvas.is-eraser {
  cursor: cell;
}

.paragraph-drawing-canvas__canvas {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
}
</style>
