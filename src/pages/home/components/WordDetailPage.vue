<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { ArrowLeft, ChevronDown, Volume2 } from 'lucide-vue-next'

import type { LocalExampleItem, WordPhrase } from '@/db/schema/database'
import {
  ensureLocalDictionary,
  lookupLocalExamples,
  lookupLocalLookalikes,
  lookupLocalPhrases,
} from '@/services/local-dictionary.service'
import { speakText } from '@/services/speech.service'
import {
  findRelatedInList,
  type RelatedWordHit,
} from '@/pages/home/utils/relatedWords'

export interface DetailWord {
  word: string
  phonetic?: string
  translation?: string
  pos?: string
  phrases?: WordPhrase[]
}

const PHRASE_PREVIEW = 3
const EXAMPLE_PREVIEW = 2

const props = defineProps<{
  words: DetailWord[]
  initialIndex?: number
}>()

const emit = defineEmits<{
  close: []
  /** 关闭时同步轮播当前词下标 */
  syncIndex: [index: number]
}>()

const TAP_THRESHOLD = 28
const SLIDE_MS = 320

const currentIndex = ref(props.initialIndex ?? 0)
const slideDir = ref<'next' | 'prev'>('next')
const isAnimating = ref(false)
const resolvedPhrases = ref<WordPhrase[]>([])
const isLoadingPhrases = ref(false)
const phrasesExpanded = ref(false)
const relatedExpanded = ref(false)
const dictRelated = ref<RelatedWordHit[]>([])
const isLoadingRelated = ref(false)
const resolvedExamples = ref<LocalExampleItem[]>([])
const isLoadingExamples = ref(false)
const examplesExpanded = ref(false)

let dragStartX = 0
let isDragging = false
let ignoreMouseUntil = 0

const total = computed(() => props.words.length)
const current = computed(() => props.words[currentIndex.value] ?? null)

const meaningText = computed(() => {
  const item = current.value
  if (!item) return ''
  return (item.translation || '').replace(/\\n/g, '\n').trim()
})

const displayPhrases = computed(() => {
  const stored = current.value?.phrases
  if (stored?.length) return stored
  return resolvedPhrases.value
})

const visiblePhrases = computed(() => {
  if (phrasesExpanded.value) return displayPhrases.value
  return displayPhrases.value.slice(0, PHRASE_PREVIEW)
})

const hiddenPhraseCount = computed(() =>
  Math.max(0, displayPhrases.value.length - PHRASE_PREVIEW),
)

const visibleExamples = computed(() => {
  if (examplesExpanded.value) return resolvedExamples.value
  return resolvedExamples.value.slice(0, EXAMPLE_PREVIEW)
})

const hiddenExampleCount = computed(() =>
  Math.max(0, resolvedExamples.value.length - EXAMPLE_PREVIEW),
)

const listRelated = computed(() => {
  const item = current.value
  if (!item) return []
  return findRelatedInList(item, props.words, currentIndex.value)
})

const relatedHits = computed(() => {
  const seen = new Set(listRelated.value.map((h) => h.word.toLowerCase()))
  const merged = [...listRelated.value]
  for (const hit of dictRelated.value) {
    const key = hit.word.toLowerCase()
    if (seen.has(key)) continue
    if (key === current.value?.word.toLowerCase()) continue
    seen.add(key)
    merged.push(hit)
  }
  return merged
})

async function resolvePhrasesForCurrent() {
  const item = current.value
  if (!item) {
    resolvedPhrases.value = []
    return
  }
  if (item.phrases?.length) {
    resolvedPhrases.value = item.phrases
    return
  }

  isLoadingPhrases.value = true
  try {
    await ensureLocalDictionary()
    resolvedPhrases.value = await lookupLocalPhrases(item.word)
  } catch {
    resolvedPhrases.value = []
  } finally {
    isLoadingPhrases.value = false
  }
}

async function resolveRelatedFromDict() {
  const item = current.value
  if (!item) {
    dictRelated.value = []
    return
  }

  isLoadingRelated.value = true
  try {
    await ensureLocalDictionary()
    const items = await lookupLocalLookalikes(item.word)
    dictRelated.value = items.map((entry) => ({
      word: entry.word,
      translation: entry.translation,
      pos: entry.pos || undefined,
      reason: 'lookalike' as const,
      reasonLabel: '形近',
    }))
  } catch {
    dictRelated.value = []
  } finally {
    isLoadingRelated.value = false
  }
}

async function resolveExamplesForCurrent() {
  const item = current.value
  if (!item) {
    resolvedExamples.value = []
    return
  }

  isLoadingExamples.value = true
  try {
    await ensureLocalDictionary()
    resolvedExamples.value = await lookupLocalExamples(item.word)
  } catch {
    resolvedExamples.value = []
  } finally {
    isLoadingExamples.value = false
  }
}

async function goTo(dir: 'next' | 'prev') {
  if (isAnimating.value || total.value <= 1) return
  isAnimating.value = true
  slideDir.value = dir
  await nextTick()

  if (dir === 'next') {
    currentIndex.value = (currentIndex.value + 1) % total.value
  } else {
    currentIndex.value = (currentIndex.value - 1 + total.value) % total.value
  }

  window.setTimeout(() => {
    isAnimating.value = false
  }, SLIDE_MS)
}

async function jumpToIndex(index: number) {
  if (index < 0 || index >= total.value || index === currentIndex.value) return
  slideDir.value = index > currentIndex.value ? 'next' : 'prev'
  isAnimating.value = true
  currentIndex.value = index
  window.setTimeout(() => {
    isAnimating.value = false
  }, SLIDE_MS)
}

function close() {
  emit('syncIndex', currentIndex.value)
  emit('close')
}

function playAudio() {
  if (current.value?.word) speakText(current.value.word)
}

function togglePhrases() {
  phrasesExpanded.value = !phrasesExpanded.value
}

function toggleRelated() {
  relatedExpanded.value = !relatedExpanded.value
}

function toggleExamples() {
  examplesExpanded.value = !examplesExpanded.value
}

function onRelatedClick(hit: RelatedWordHit) {
  if (typeof hit.index === 'number') {
    void jumpToIndex(hit.index)
  }
}

function onPointerDown(clientX: number) {
  dragStartX = clientX
  isDragging = true
}

function onPointerUp(clientX: number) {
  if (!isDragging) return
  isDragging = false
  const deltaX = clientX - dragStartX
  if (Math.abs(deltaX) < TAP_THRESHOLD) return
  if (deltaX < 0) void goTo('next')
  else void goTo('prev')
}

function onTouchStart(e: TouchEvent) {
  onPointerDown(e.touches[0].clientX)
}

function onTouchEnd(e: TouchEvent) {
  onPointerUp(e.changedTouches[0].clientX)
  ignoreMouseUntil = Date.now() + 600
}

function onTouchCancel() {
  isDragging = false
  ignoreMouseUntil = Date.now() + 600
}

function onMouseDown(e: MouseEvent) {
  if (Date.now() < ignoreMouseUntil) return
  if (e.button !== 0) return
  onPointerDown(e.clientX)
}

function onMouseUp(e: MouseEvent) {
  if (Date.now() < ignoreMouseUntil) return
  onPointerUp(e.clientX)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
  else if (e.key === 'ArrowLeft') void goTo('prev')
  else if (e.key === 'ArrowRight') void goTo('next')
}

watch(
  () => props.initialIndex,
  (v) => {
    if (typeof v === 'number' && v >= 0) currentIndex.value = v
  },
)

watch(
  currentIndex,
  () => {
    phrasesExpanded.value = false
    relatedExpanded.value = false
    examplesExpanded.value = false
    void resolvePhrasesForCurrent()
    void resolveRelatedFromDict()
    void resolveExamplesForCurrent()
  },
  { immediate: true },
)

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <div class="word-detail" role="dialog" aria-modal="true" aria-label="单词详情">
      <header class="word-detail__header">
        <button class="word-detail__icon-btn" type="button" aria-label="返回" @click="close">
          <ArrowLeft :size="20" />
        </button>
        <p class="word-detail__progress">
          {{ currentIndex + 1 }} / {{ total }}
        </p>
        <button
          class="word-detail__icon-btn"
          type="button"
          aria-label="朗读"
          :disabled="!current?.word"
          @click="playAudio"
        >
          <Volume2 :size="18" />
        </button>
      </header>

      <div
        class="word-detail__stage"
        :class="slideDir === 'next' ? 'is-dir-next' : 'is-dir-prev'"
        @touchstart.passive="onTouchStart"
        @touchend.prevent="onTouchEnd"
        @touchcancel="onTouchCancel"
        @mousedown="onMouseDown"
        @mouseup="onMouseUp"
      >
        <Transition :name="slideDir === 'next' ? 'detail-next' : 'detail-prev'" mode="out-in">
          <article
            v-if="current"
            :key="`${currentIndex}-${current.word}`"
            class="word-detail__card"
          >
            <h1 class="word-detail__word">{{ current.word }}</h1>

            <div class="word-detail__phonetic-row">
              <span v-if="current.phonetic" class="word-detail__phonetic">{{ current.phonetic }}</span>
              <span v-if="current.pos" class="word-detail__pos">{{ current.pos }}</span>
            </div>

            <section class="word-detail__section">
              <h2 class="word-detail__section-title">释义</h2>
              <p v-if="meaningText" class="word-detail__meaning">{{ meaningText }}</p>
              <p v-else class="word-detail__empty">暂无释义</p>
            </section>

            <section class="word-detail__section">
              <h2 class="word-detail__section-title">固定搭配</h2>
              <p v-if="isLoadingPhrases" class="word-detail__empty">加载短语…</p>
              <template v-else-if="displayPhrases.length">
                <ul class="word-detail__phrases">
                  <li
                    v-for="item in visiblePhrases"
                    :key="item.phrase"
                    class="word-detail__phrase-item"
                  >
                    <span class="word-detail__phrase">{{ item.phrase }}</span>
                    <span class="word-detail__phrase-tr">{{ item.translation }}</span>
                  </li>
                </ul>
                <button
                  v-if="hiddenPhraseCount > 0"
                  class="word-detail__fold"
                  type="button"
                  :aria-expanded="phrasesExpanded"
                  @click.stop="togglePhrases"
                >
                  <span>{{ phrasesExpanded ? '收起' : `展开另外 ${hiddenPhraseCount} 条` }}</span>
                  <ChevronDown
                    class="word-detail__fold-icon"
                    :class="{ 'is-open': phrasesExpanded }"
                    :size="14"
                  />
                </button>
              </template>
              <p v-else class="word-detail__empty">暂无相关短语</p>
            </section>

            <section class="word-detail__section">
              <button
                class="word-detail__section-toggle"
                type="button"
                :aria-expanded="relatedExpanded"
                @click.stop="toggleRelated"
              >
                <span class="word-detail__section-title">相近词</span>
                <span class="word-detail__section-meta">
                  {{ relatedHits.length ? `${relatedHits.length} 个` : '形近 / 同根 / 近义' }}
                  <ChevronDown
                    class="word-detail__fold-icon"
                    :class="{ 'is-open': relatedExpanded }"
                    :size="14"
                  />
                </span>
              </button>

              <div v-if="relatedExpanded" class="word-detail__related-body">
                <p v-if="isLoadingRelated && !relatedHits.length" class="word-detail__empty">
                  查找相近词…
                </p>
                <ul v-else-if="relatedHits.length" class="word-detail__related-list">
                  <li
                    v-for="hit in relatedHits"
                    :key="`${hit.reason}-${hit.word}`"
                    class="word-detail__related-item"
                    :class="{ 'is-jumpable': typeof hit.index === 'number' }"
                    @click.stop="onRelatedClick(hit)"
                  >
                    <div class="word-detail__related-head">
                      <span class="word-detail__related-word">{{ hit.word }}</span>
                      <span class="word-detail__related-tag">{{ hit.reasonLabel }}</span>
                    </div>
                    <p class="word-detail__related-tr">
                      <span v-if="hit.pos" class="word-detail__related-pos">{{ hit.pos }}</span>
                      {{ hit.translation }}
                    </p>
                  </li>
                </ul>
                <p v-else class="word-detail__empty">当日词表与词典中暂未找到相近词</p>
              </div>
            </section>

            <section class="word-detail__section">
              <h2 class="word-detail__section-title">例句</h2>
              <p v-if="isLoadingExamples" class="word-detail__empty">加载例句…</p>
              <template v-else-if="resolvedExamples.length">
                <ul class="word-detail__examples">
                  <li
                    v-for="(item, idx) in visibleExamples"
                    :key="`${idx}-${item.sentence}`"
                    class="word-detail__example-item"
                  >
                    <p class="word-detail__example-en">{{ item.sentence }}</p>
                    <p v-if="item.translation" class="word-detail__example-zh">
                      {{ item.translation }}
                    </p>
                  </li>
                </ul>
                <button
                  v-if="hiddenExampleCount > 0"
                  class="word-detail__fold"
                  type="button"
                  :aria-expanded="examplesExpanded"
                  @click.stop="toggleExamples"
                >
                  <span>{{ examplesExpanded ? '收起' : `展开另外 ${hiddenExampleCount} 条` }}</span>
                  <ChevronDown
                    class="word-detail__fold-icon"
                    :class="{ 'is-open': examplesExpanded }"
                    :size="14"
                  />
                </button>
                <p class="word-detail__attr">例句来自 Tatoeba · CC BY 2.0 FR</p>
              </template>
              <p v-else class="word-detail__empty">暂无本地例句</p>
            </section>
          </article>
        </Transition>
      </div>

      <p class="word-detail__hint">左右滑动切换单词</p>
    </div>
  </Teleport>
</template>

<style scoped>
.word-detail {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  flex-direction: column;
  /* 实底挡住主页；壁纸画在本层伪元素上，与系统同一套 CSS 变量 */
  background-color: #f8fafc;
  color: var(--app-font-color, #0f172a);
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: pan-y;
  isolation: isolate;
}

.word-detail::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  background-image: var(--wallpaper-bg);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  filter: var(--wallpaper-blur);
  pointer-events: none;
}

.word-detail::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  background: var(--wallpaper-overlay);
  pointer-events: none;
}

.word-detail > * {
  position: relative;
  z-index: 1;
}

.word-detail__header {
  flex-shrink: 0;
  display: grid;
  grid-template-columns: 44px 1fr 44px;
  align-items: center;
  gap: 4px;
  min-height: 56px;
  padding: 8px 8px;
  padding-top: max(8px, env(safe-area-inset-top));
}

.word-detail__icon-btn {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: var(--app-font-color-muted, #475569);
  cursor: pointer;
}

.word-detail__icon-btn:hover {
  background: rgba(148, 163, 184, 0.16);
}

.word-detail__icon-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.word-detail__progress {
  margin: 0;
  text-align: center;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--app-font-color-soft, #94a3b8);
}

.word-detail__stage {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: stretch;
  justify-content: stretch;
  padding: 0;
  cursor: grab;
  overflow: hidden;
}

.word-detail__stage:active {
  cursor: grabbing;
}

.word-detail__card {
  width: 100%;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 16px 16px 12px;
  overflow-y: auto;
  overscroll-behavior: contain;
  box-sizing: border-box;
}

.word-detail__word {
  margin: 0;
  text-align: center;
  font-size: clamp(2.5rem, 10vw, 3.75rem);
  font-weight: 800;
  letter-spacing: -1.5px;
  line-height: 1.05;
  word-break: break-word;
}

.word-detail__phonetic-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: -8px;
}

.word-detail__phonetic {
  font-size: 1rem;
  color: var(--app-font-color-muted, #64748b);
}

.word-detail__pos {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(148, 163, 184, 0.2);
  color: var(--app-font-color-muted, #475569);
  font-size: 0.75rem;
  font-weight: 700;
}

.word-detail__section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.word-detail__section-title {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--app-font-color-soft, #94a3b8);
}

.word-detail__meaning {
  margin: 0;
  width: 100%;
  font-size: 1.125rem;
  font-weight: 600;
  line-height: 1.55;
  white-space: pre-wrap;
}

.word-detail__empty {
  margin: 0;
  font-size: 0.875rem;
  color: var(--app-font-color-soft, #94a3b8);
}

.word-detail__phrases {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
}

.word-detail__phrase-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
}

.word-detail__phrase {
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.35;
}

.word-detail__phrase-tr {
  font-size: 0.875rem;
  line-height: 1.45;
  color: var(--app-font-color-muted, #64748b);
}

.word-detail__fold {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: 4px;
  margin: 0;
  padding: 4px 0;
  border: 0;
  background: transparent;
  color: var(--app-font-color-muted, #64748b);
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
}

.word-detail__fold-icon {
  transition: transform 0.2s ease;
}

.word-detail__fold-icon.is-open {
  transform: rotate(180deg);
}

.word-detail__section-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  text-align: left;
}

.word-detail__section-meta {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--app-font-color-soft, #94a3b8);
}

.word-detail__related-body {
  width: 100%;
}

.word-detail__related-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.word-detail__related-item {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.word-detail__related-item.is-jumpable {
  cursor: pointer;
}

.word-detail__related-item.is-jumpable:active {
  opacity: 0.75;
}

.word-detail__related-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.word-detail__related-word {
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.3;
}

.word-detail__related-tag {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(148, 163, 184, 0.18);
  color: var(--app-font-color-muted, #64748b);
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.word-detail__related-tr {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.45;
  color: var(--app-font-color-muted, #64748b);
}

.word-detail__related-pos {
  margin-right: 4px;
  font-weight: 700;
  font-size: 0.6875rem;
}

.word-detail__examples {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
}

.word-detail__example-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
}

.word-detail__example-en {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.5;
}

.word-detail__example-zh {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.45;
  color: var(--app-font-color-muted, #64748b);
}

.word-detail__attr {
  margin: 4px 0 0;
  font-size: 0.6875rem;
  line-height: 1.4;
  color: var(--app-font-color-soft, #94a3b8);
}

.word-detail__hint {
  flex-shrink: 0;
  margin: 0;
  padding: 12px 16px calc(16px + env(safe-area-inset-bottom));
  text-align: center;
  font-size: 0.75rem;
  color: var(--app-font-color-soft, #94a3b8);
}

.detail-next-enter-active,
.detail-next-leave-active,
.detail-prev-enter-active,
.detail-prev-leave-active {
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s ease;
}

.detail-next-enter-from {
  opacity: 0;
  transform: translateX(36%);
}

.detail-next-leave-to {
  opacity: 0;
  transform: translateX(-28%);
}

.detail-prev-enter-from {
  opacity: 0;
  transform: translateX(-36%);
}

.detail-prev-leave-to {
  opacity: 0;
  transform: translateX(28%);
}
</style>
