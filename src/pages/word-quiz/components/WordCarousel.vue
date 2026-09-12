<script setup lang="ts">
import { computed } from 'vue'

export interface CarouselWord {
  word: string
  phonetic?: string
  /** 中文释义提示，用稍小字号更易读 */
  isChinese?: boolean
}

const props = defineProps<{
  words: CarouselWord[]
  currentIndex: number
}>()

const RADIUS = 280

const angleStep = computed(() => {
  const count = props.words.length
  return count > 0 ? 360 / count : 0
})

const carouselTransform = computed(() => {
  const rotation = -angleStep.value * props.currentIndex
  return `translateZ(-${RADIUS}px) rotateY(${rotation}deg)`
})

function getDiff(index: number) {
  const count = props.words.length
  if (count === 0) return 0

  let diff = index - props.currentIndex
  if (diff > count / 2) diff -= count
  if (diff < -count / 2) diff += count
  return diff
}

function getItemStyle(index: number) {
  const diff = getDiff(index)
  const base = `rotateY(${angleStep.value * index}deg)`

  if (diff === 0) {
    return {
      transform: `${base} translateZ(${RADIUS + 30}px) scale(1.15)`,
      zIndex: 10,
      opacity: 1,
      filter: 'blur(0px)'
    }
  }

  if (Math.abs(diff) === 1) {
    return {
      transform: `${base} translateZ(${RADIUS}px) scale(0.85)`,
      zIndex: 5,
      opacity: 0.28,
      filter: 'blur(2px)'
    }
  }

  return {
    transform: `${base} translateZ(${RADIUS - 50}px) scale(0.6)`,
    zIndex: 1,
    opacity: 0.08,
    filter: 'blur(4px)'
  }
}

function isActive(index: number) {
  return getDiff(index) === 0
}
</script>

<template>
  <div class="word-carousel-scene">
    <div
      class="word-carousel"
      :style="{ transform: carouselTransform }"
    >
      <div
        v-for="(item, index) in words"
        :key="`${item.word}-${index}`"
        class="word-carousel__item"
        :class="{ 'is-active': isActive(index) }"
        :style="getItemStyle(index)"
      >
        <div
          class="word-carousel__word"
          :class="{ 'is-chinese': item.isChinese }"
        >
          {{ item.word }}
        </div>
        <div v-if="item.phonetic" class="word-carousel__phonetic">
          {{ item.phonetic }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.word-carousel-scene {
  flex: 1;
  width: 100%;
  min-height: 200px;
  perspective: 1000px;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: -24px;
  overflow: hidden;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.word-carousel {
  width: 300px;
  height: 200px;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.6s cubic-bezier(0.25, 1, 0.5, 1);
}

.word-carousel__item {
  position: absolute;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  transition: all 0.6s cubic-bezier(0.25, 1, 0.5, 1);
  transform-origin: center center;
  pointer-events: none;
}

.word-carousel__word {
  font-size: clamp(40px, 12vw, 72px);
  font-weight: 800;
  letter-spacing: -2px;
  color: rgba(255, 255, 255, 0.45);
  text-shadow: 0 2px 24px rgba(0, 0, 0, 0.35);
  transition: color 0.6s ease, text-shadow 0.6s ease;
  word-break: break-word;
  text-align: center;
  line-height: 1.1;
  max-width: 92%;
  padding: 0 8px;
}

.word-carousel__word.is-chinese {
  font-size: clamp(28px, 7.5vw, 44px);
  font-weight: 700;
  letter-spacing: 0.06em;
  line-height: 1.35;
}

.word-carousel__item.is-active .word-carousel__word {
  color: #ffffff;
  text-shadow:
    0 2px 20px rgba(0, 0, 0, 0.45),
    0 0 30px rgba(255, 255, 255, 0.12);
}

.word-carousel__phonetic {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.45);
  margin-top: 8px;
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.35);
  transition: opacity 0.6s ease;
}

.word-carousel__item:not(.is-active) .word-carousel__phonetic {
  opacity: 0.4;
}
</style>
