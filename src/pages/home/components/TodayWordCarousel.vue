<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { getWordsByDate } from '@/db/repositories/words.repository'

export interface CarouselWord {
  word: string
  phonetic?: string
  translation?: string
  pos?: string
}

const props = withDefaults(
  defineProps<{
    date?: string
  }>(),
  {
    date: '',
  },
)

const AUTO_INTERVAL_MS = 3600
const TAP_THRESHOLD = 36

const words = ref<CarouselWord[]>([])
const currentIndex = ref(0)
const isAnimating = ref(false)
const isLoading = ref(true)
const showMeaning = ref(false)
/** next = 向左滑出（显示下一个）；prev = 向右滑出（显示上一个） */
const slideDir = ref<'next' | 'prev'>('next')

let autoTimer: ReturnType<typeof setInterval> | null = null
let dragStartX = 0
let isDragging = false

const cardCount = computed(() => words.value.length)

const activeDate = computed(
  () => props.date || new Date().toISOString().split('T')[0],
)

const isToday = computed(() => activeDate.value === new Date().toISOString().split('T')[0])

const currentWord = computed(() => words.value[currentIndex.value] ?? null)

const visibleSlots = computed(() => {
  const count = cardCount.value
  if (count === 0) return []

  const slots: Array<{
    item: CarouselWord
    index: number
    position: 'left' | 'center' | 'right'
  }> = []

  const center = currentIndex.value
  const left = (center - 1 + count) % count
  const right = (center + 1) % count

  if (count === 1) {
    slots.push({ item: words.value[center], index: center, position: 'center' })
    return slots
  }

  slots.push({ item: words.value[left], index: left, position: 'left' })
  slots.push({ item: words.value[center], index: center, position: 'center' })

  if (count > 2) {
    slots.push({ item: words.value[right], index: right, position: 'right' })
  }

  return slots
})

const meaningText = computed(() => {
  const item = currentWord.value
  if (!item) return ''
  const parts = [item.pos, item.translation].filter(Boolean)
  return parts.join(' ')
})

const metaLabel = computed(() => {
  const prefix = isToday.value ? '今日' : '当日'
  return `${prefix} ${words.value.length} 词`
})

async function loadWords() {
  isLoading.value = true
  try {
    const list = await getWordsByDate(activeDate.value)
    words.value = list.map((item) => ({
      word: item.word,
      phonetic: item.phonetic || '',
      translation: item.translation || '',
      pos: item.pos || '',
    }))
    currentIndex.value = 0
    showMeaning.value = false
  } catch (error) {
    console.error('Failed to load words for carousel:', error)
    words.value = []
  } finally {
    isLoading.value = false
    restartAutoRotate()
  }
}

async function goTo(dir: 'next' | 'prev') {
  if (isAnimating.value || cardCount.value <= 1) return
  isAnimating.value = true
  showMeaning.value = false
  slideDir.value = dir
  await nextTick()

  if (dir === 'next') {
    currentIndex.value = (currentIndex.value + 1) % cardCount.value
  } else {
    currentIndex.value = (currentIndex.value - 1 + cardCount.value) % cardCount.value
  }

  window.setTimeout(() => {
    isAnimating.value = false
  }, 320)
}

function nextWord() {
  void goTo('next')
}

function prevWord() {
  void goTo('prev')
}

function toggleMeaning() {
  showMeaning.value = !showMeaning.value
  if (showMeaning.value) {
    stopAutoRotate()
  } else {
    restartAutoRotate()
  }
}

function restartAutoRotate() {
  stopAutoRotate()
  if (cardCount.value <= 1 || showMeaning.value) return
  autoTimer = setInterval(nextWord, AUTO_INTERVAL_MS)
}

function stopAutoRotate() {
  if (autoTimer) {
    clearInterval(autoTimer)
    autoTimer = null
  }
}

function onPointerDown(clientX: number) {
  dragStartX = clientX
  isDragging = true
  stopAutoRotate()
}

function onPointerUp(clientX: number) {
  if (!isDragging) return
  isDragging = false
  const deltaX = clientX - dragStartX

  if (Math.abs(deltaX) < TAP_THRESHOLD) {
    toggleMeaning()
  } else if (deltaX < 0) {
    nextWord()
  } else {
    prevWord()
  }

  if (!showMeaning.value) {
    restartAutoRotate()
  }
}

function onTouchStart(e: TouchEvent) {
  onPointerDown(e.touches[0].clientX)
}

function onTouchEnd(e: TouchEvent) {
  onPointerUp(e.changedTouches[0].clientX)
}

function onMouseDown(e: MouseEvent) {
  onPointerDown(e.clientX)
}

function onMouseUp(e: MouseEvent) {
  onPointerUp(e.clientX)
}

onMounted(() => {
  void loadWords()
})

watch(
  () => props.date,
  () => {
    void loadWords()
  },
)

onUnmounted(() => {
  stopAutoRotate()
})

defineExpose({
  reload: loadWords,
})
</script>

<template>
  <div class="word-strip" aria-label="当日单词滑动条">
    <div v-if="isLoading" class="word-strip__status">加载单词…</div>

    <div v-else-if="words.length === 0" class="word-strip__status">
      <p class="word-strip__empty-title">{{ isToday ? '今日暂无单词' : '当日暂无单词' }}</p>
      <p class="word-strip__empty-hint">去单词本导入后再回来看看</p>
    </div>

    <div
      v-else
      class="word-strip__scene"
      :class="slideDir === 'next' ? 'is-dir-next' : 'is-dir-prev'"
      @touchstart.passive="onTouchStart"
      @touchend="onTouchEnd"
      @mousedown="onMouseDown"
      @mouseup="onMouseUp"
    >
      <TransitionGroup name="word-slide" tag="div" class="word-strip__track">
        <div
          v-for="slot in visibleSlots"
          :key="slot.index"
          class="word-strip__item"
          :class="`is-${slot.position}`"
        >
          <div class="word-strip__word">{{ slot.item.word }}</div>
          <div
            v-if="slot.position === 'center' && slot.item.phonetic"
            class="word-strip__phonetic"
          >
            {{ slot.item.phonetic }}
          </div>
        </div>
      </TransitionGroup>

      <Transition name="meaning-fade">
        <div v-if="showMeaning" class="word-strip__meaning">
          <p v-if="meaningText" class="word-strip__meaning-text">{{ meaningText }}</p>
          <p v-else class="word-strip__meaning-empty">暂无释义</p>
        </div>
      </Transition>

      <p class="word-strip__meta">{{ metaLabel }}</p>
    </div>
  </div>
</template>

<style scoped>
.word-strip {
  width: 100%;
  height: 100%;
  min-height: 240px;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.word-strip__status {
  width: 100%;
  text-align: center;
  color: var(--app-font-color-soft, #94a3b8);
}

.word-strip__empty-title {
  margin: 0 0 6px;
  font-size: 16px;
  font-weight: 650;
  color: var(--app-font-color-muted, #64748b);
}

.word-strip__empty-hint {
  margin: 0;
  font-size: 13px;
}

.word-strip__scene {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: grab;
}

.word-strip__scene:active {
  cursor: grabbing;
}

.word-strip__track {
  position: relative;
  width: min(100%, 420px);
  height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.word-strip__item {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 42%;
  max-width: 180px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  pointer-events: none;
  transition:
    transform 0.32s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.32s ease,
    filter 0.32s ease;
  will-change: transform, opacity;
}

.word-strip__item.is-left {
  transform: translate(-132%, -50%) scale(0.72);
  opacity: 0.38;
  filter: blur(0.4px);
  z-index: 1;
}

.word-strip__item.is-center {
  transform: translate(-50%, -50%) scale(1);
  opacity: 1;
  filter: none;
  z-index: 3;
}

.word-strip__item.is-right {
  transform: translate(32%, -50%) scale(0.72);
  opacity: 0.38;
  filter: blur(0.4px);
  z-index: 1;
}

.word-strip__word {
  max-width: 100%;
  font-size: clamp(28px, 7.2vw, 44px);
  font-weight: 800;
  letter-spacing: -1px;
  line-height: 1.1;
  word-break: break-word;
  color: var(--app-font-color-muted, #64748b);
  transition: color 0.32s ease, font-size 0.32s ease;
}

.word-strip__item.is-center .word-strip__word {
  font-size: clamp(40px, 10vw, 60px);
  color: var(--app-font-color, #0f172a);
}

.word-strip__phonetic {
  margin-top: 8px;
  font-size: 14px;
  color: var(--app-font-color-soft, #94a3b8);
}

.word-strip__meaning {
  margin-top: 12px;
  max-width: min(360px, 88vw);
  min-height: 28px;
  text-align: center;
}

.word-strip__meaning-text {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.45;
  color: var(--app-font-color, #0f172a);
}

.word-strip__meaning-empty {
  margin: 0;
  font-size: 13px;
  color: var(--app-font-color-soft, #94a3b8);
}

.word-strip__meta {
  margin: 14px 0 0;
  font-size: 13px;
  color: var(--app-font-color-soft, #94a3b8);
  opacity: 0.85;
}

/* 进出场：配合滑动方向 */
.word-slide-enter-active,
.word-slide-leave-active {
  transition:
    transform 0.32s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.32s ease;
}

.is-dir-next .word-slide-enter-from {
  opacity: 0;
  transform: translate(90%, -50%) scale(0.62);
}

.is-dir-next .word-slide-leave-to {
  opacity: 0;
  transform: translate(-170%, -50%) scale(0.62);
}

.is-dir-prev .word-slide-enter-from {
  opacity: 0;
  transform: translate(-170%, -50%) scale(0.62);
}

.is-dir-prev .word-slide-leave-to {
  opacity: 0;
  transform: translate(90%, -50%) scale(0.62);
}

.meaning-fade-enter-active,
.meaning-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.meaning-fade-enter-from,
.meaning-fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
