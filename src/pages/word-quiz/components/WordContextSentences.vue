<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { ChevronDown, Loader2, RefreshCw, Sparkles } from 'lucide-vue-next'
import { useWordContextSentences } from '../composables/useWordContextSentences'

interface Props {
  word: string
  /** 词典释义，供 AI 把握词义 */
  gloss?: string
  /** 是否已揭示中文释义（作答后为 true） */
  definitionRevealed?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  definitionRevealed: false,
})

const {
  sentences,
  isLoading,
  isGenerating,
  needsAiExamples,
  error,
  findSentencesByWord,
  generateWithAi,
} = useWordContextSentences()

/** 默认展开例句，换词后仍保持展开 */
const isCollapsed = ref(false)
const zhHintVisible = ref(false)

const headerLabel = computed(() => {
  if (isLoading.value) return '精选中…'
  if (isGenerating.value) return '生成中…'
  if (sentences.value.length === 0) return '例句'
  return `例句 (${sentences.value.length})`
})

const canToggle = computed(
  () => !isLoading.value && !isGenerating.value && sentences.value.length > 0,
)

/** 缺例句：首次生成；已有例句：允许强制再生成（覆盖低质句） */
const showAiStar = computed(
  () => !isLoading.value && (needsAiExamples.value || sentences.value.length > 0),
)

const isRegenMode = computed(
  () => !needsAiExamples.value && sentences.value.length > 0,
)

/** 已展开例句、尚未揭示中文词义时，显示「再提示 · 句译」 */
const showZhHintEntry = computed(
  () =>
    !isCollapsed.value &&
    sentences.value.length > 0 &&
    !props.definitionRevealed &&
    !zhHintVisible.value,
)

const showSentenceTranslations = computed(
  () => zhHintVisible.value && !props.definitionRevealed,
)

onMounted(() => {
  if (props.word) {
    findSentencesByWord(props.word)
  }
})

watch(
  () => props.word,
  (newWord) => {
    if (newWord) {
      isCollapsed.value = false
      zhHintVisible.value = false
      findSentencesByWord(newWord)
    }
  },
)

watch(
  () => props.definitionRevealed,
  (revealed) => {
    if (revealed) {
      // 中文词义已揭示后收起句译，避免与正确答案抢注意力
      zhHintVisible.value = false
    }
  },
)

function toggleCollapse() {
  if (!canToggle.value) return
  isCollapsed.value = !isCollapsed.value
  if (isCollapsed.value) {
    zhHintVisible.value = false
  }
}

async function handleGenerate(event: Event) {
  event.stopPropagation()
  await generateWithAi(props.word, props.gloss, { force: isRegenMode.value })
  if (sentences.value.length > 0) {
    isCollapsed.value = false
  }
}

function revealZhHint() {
  zhHintVisible.value = true
}
</script>

<template>
  <div
    class="example-panel"
    :class="{
      'is-open': !isCollapsed && sentences.length > 0,
      'has-zh-hint': showSentenceTranslations,
    }"
  >
    <div class="example-panel__toolbar">
      <button
        type="button"
        class="example-panel__header"
        :disabled="!canToggle"
        @click="toggleCollapse"
      >
        <span>{{ headerLabel }}</span>
        <ChevronDown
          v-if="sentences.length > 0"
          :size="14"
          class="example-panel__chevron"
          :class="{ 'is-rotated': !isCollapsed }"
        />
      </button>

      <button
        v-if="showAiStar"
        type="button"
        class="example-panel__star"
        :class="{ 'is-regen': isRegenMode }"
        :disabled="isGenerating"
        :aria-label="
          isGenerating
            ? '正在生成例句'
            : isRegenMode
              ? '重新生成例句'
              : 'AI 生成例句'
        "
        :title="
          isGenerating
            ? '生成中…'
            : isRegenMode
              ? '例句不好用？点此重新生成（会覆盖旧例句）'
              : 'AI 生成高质量例句'
        "
        @click="handleGenerate"
      >
        <Loader2 v-if="isGenerating" :size="15" class="is-spinning" />
        <RefreshCw v-else-if="isRegenMode" :size="15" />
        <Sparkles v-else :size="15" />
      </button>
    </div>

    <div v-if="!isCollapsed && sentences.length > 0" class="example-panel__content">
      <div
        v-for="(item, index) in sentences"
        :key="`${index}-${item.sentence}`"
        class="example-panel__item"
      >
        <div class="example-panel__sentence" v-html="item.sentence" />
        <p
          v-if="showSentenceTranslations"
          class="example-panel__translation"
        >
          {{ item.translation?.trim() || '暂无译文' }}
        </p>
      </div>

      <div v-if="showZhHintEntry" class="example-panel__hint-entry">
        <button
          type="button"
          class="example-panel__hint-btn"
          @click="revealZhHint"
        >
          再提示 · 句译
        </button>
      </div>
    </div>

    <div v-if="error" class="example-panel__state example-panel__state--error">
      {{ error }}
    </div>
  </div>
</template>
