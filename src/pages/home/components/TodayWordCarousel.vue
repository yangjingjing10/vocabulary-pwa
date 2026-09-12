<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
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

const RADIUS = 300
const AUTO_INTERVAL_MS = 3200
const TAP_THRESHOLD = 28

const words = ref<CarouselWord[]>([])
const currentIndex = ref(0)
const isAnimating = ref(false)
const isLoading = ref(true)
const showMeaning = ref(false)

let autoTimer: ReturnType<typeof setInterval> | null = null
let dragStartX = 0
let isDragging = false

const cardCount = computed(() => words.value.length)
const angleStep = computed(() => (cardCount.value > 0 ? 360 / cardCount.value : 0))
const currentWord = computed(() => words.value[currentIndex.value] ?? null)

const activeDate = computed(
  () => props.date || new Date().toISOString().split('T')[0],
)

const isToday = computed(() => activeDate.value === new Date().toISOString().split('T')[0])

const carouselTransform = computed(() => {
  const rotation = -angleStep.value * currentIndex.value
  return `translateZ(-${RADIUS}px) rotateY(${rotation}deg)`
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

function getDiff(index: number) {
  const count = cardCount.value
  if (count === 0) return 0

  let diff = index - currentIndex.value
  if (diff > count / 2) diff -= count
  if (diff < -count / 2) diff += count
  return diff
}

function getItemStyle(index: number) {
  const diff = getDiff(index)
  const base = `rotateY(${angleStep.value * index}deg)`

  if (diff === 0) {
    return {
      transform: `${base} translateZ(${RADIUS + 28}px) scale(1.12)`,
      zIndex: 10,
      opacity: 1,
      filter: 'blur(0px)',
    }
  }

  if (Math.abs(diff) === 1) {
    return {
      transform: `${base} translateZ(${RADIUS}px) scale(0.82)`,
      zIndex: 5,
      opacity: 0.38,
      filter: 'blur(1.5px)',
    }
  }

  return {
    transform: `${base} translateZ(${RADIUS - 40}px) scale(0.58)`,
    zIndex: 1,
    opacity: 0.12,
    filter: 'blur(3.5px)',
  }
}

function isActive(index: number) {
  return getDiff(index) === 0
}

function nextWord() {
  if (isAnimating.value || cardCount.value <= 1) return
  isAnimating.value = true
  showMeaning.value = false
  currentIndex.value = (currentIndex.value + 1) % cardCount.value
  window.setTimeout(() => {
    isAnimating.value = false
  }, 520)
}

function prevWord() {
  if (isAnimating.value || cardCount.value <= 1) return
  isAnimating.value = true
  showMeaning.value = false
  currentIndex.value = (currentIndex.value - 1 + cardCount.value) % cardCount.value
  window.setTimeout(() => {
    isAnimating.value = false
  }, 520)
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
  <div class="today-word-carousel" aria-label="今日上传单词旋转木马">
    <div v-if="isLoading" class="today-word-carousel__status">加载今日单词…</div>

    <div v-else-if="words.length === 0" class="today-word-carousel__status">
      <p class="today-word-carousel__empty-title">{{ isToday ? '今日暂无单词' : '当日暂无单词' }}</p>
      <p class="today-word-carousel__empty-hint">点击右上角 + 开始上传</p>
    </div>

    <div
      v-else
      class="today-word-carousel__scene"
      @touchstart.passive="onTouchStart"
      @touchend="onTouchEnd"
      @mousedown="onMouseDown"
      @mouseup="onMouseUp"
    >
      <div class="today-word-carousel__stage" :style="{ transform: carouselTransform }">
        <div
          v-for="(item, index) in words"
          :key="`${item.word}-${index}`"
          class="today-word-carousel__item"
          :class="{ 'is-active': isActive(index) }"
          :style="getItemStyle(index)"
        >
          <div class="today-word-carousel__word">{{ item.word }}</div>
          <div v-if="item.phonetic" class="today-word-carousel__phonetic">
            {{ item.phonetic }}
          </div>
        </div>
      </div>

      <Transition name="meaning-fade">
        <div v-if="showMeaning" class="today-word-carousel__meaning">
          <p v-if="meaningText" class="today-word-carousel__meaning-text">{{ meaningText }}</p>
          <p v-else class="today-word-carousel__meaning-empty">暂无释义</p>
        </div>
      </Transition>

      <p class="today-word-carousel__meta">{{ metaLabel }}</p>
    </div>
  </div>
</template>

<style scoped>
.today-word-carousel {
  width: 100%;
  height: 100%;
  min-height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.today-word-carousel__status {
  width: 100%;
  text-align: center;
  color: var(--app-font-color-soft, #94a3b8);
}

.today-word-carousel__empty-title {
  margin: 0 0 6px;
  font-size: 16px;
  font-weight: 650;
  color: var(--app-font-color-muted, #64748b);
}

.today-word-carousel__empty-hint {
  margin: 0;
  font-size: 13px;
}

.today-word-carousel__scene {
  position: relative;
  width: 100%;
  padding: 8px 0 20px;
  perspective: 1200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: visible;
}

.today-word-carousel__stage {
  width: min(360px, 88vw);
  height: 200px;
  position: relative;
  flex-shrink: 0;
  transform-style: preserve-3d;
  transition: transform 0.55s cubic-bezier(0.25, 1, 0.5, 1);
}

.today-word-carousel__item {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  transform-origin: center center;
  pointer-events: none;
  transition: all 0.55s cubic-bezier(0.25, 1, 0.5, 1);
}

.today-word-carousel__word {
  max-width: 94%;
  padding: 0 8px;
  font-size: clamp(44px, 11vw, 68px);
  font-weight: 800;
  letter-spacing: -1.6px;
  line-height: 1.08;
  text-align: center;
  word-break: break-word;
  color: var(--app-font-color-muted, #64748b);
  transition: color 0.55s ease;
}

.today-word-carousel__item.is-active .today-word-carousel__word {
  color: var(--app-font-color, #0f172a);
}

.today-word-carousel__phonetic {
  margin-top: 10px;
  font-size: 16px;
  color: var(--app-font-color-soft, #94a3b8);
  transition: opacity 0.55s ease;
}

.today-word-carousel__item:not(.is-active) .today-word-carousel__phonetic {
  opacity: 0.45;
}

.today-word-carousel__meaning {
  margin-top: 14px;
  max-width: min(360px, 88vw);
  min-height: 30px;
  text-align: center;
}

.today-word-carousel__meaning-text {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.45;
  color: var(--app-font-color, #0f172a);
}

.today-word-carousel__meaning-empty {
  margin: 0;
  font-size: 13px;
  color: var(--app-font-color-soft, #94a3b8);
}

.today-word-carousel__meta {
  margin: 16px 0 0;
  font-size: 13px;
  letter-spacing: 0.02em;
  color: var(--app-font-color-soft, #94a3b8);
  opacity: 0.85;
}

.meaning-fade-enter-active,
.meaning-fade-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.meaning-fade-enter-from,
.meaning-fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
