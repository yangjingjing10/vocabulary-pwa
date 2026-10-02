<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { ChevronDown, Loader2, RefreshCw, Sparkles } from 'lucide-vue-next'
import { useWordContextSentences } from '../composables/useWordContextSentences'
import {
  fetchEnglishDefinitions,
  englishDefinitionSourceLabel,
  type EnglishSense,
  type EnglishDefinitionResult,
} from '@/services/english-definition.service'

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

const isCollapsed = ref(true)
const englishHintVisible = ref(false)
const englishSenses = ref<EnglishSense[]>([])
const englishSource = ref<EnglishDefinitionResult['source'] | undefined>()
const isLoadingEnglish = ref(false)
const englishError = ref('')

const englishSourceText = computed(() => englishDefinitionSourceLabel(englishSource.value))

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

/** 已展开例句、尚未揭示中文时，显示「再提示」入口 */
const showEnglishHintEntry = computed(
  () =>
    !isCollapsed.value &&
    sentences.value.length > 0 &&
    !props.definitionRevealed &&
    !englishHintVisible.value,
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
      isCollapsed.value = true
      resetEnglishHint()
      findSentencesByWord(newWord)
    }
  },
)

watch(
  () => props.definitionRevealed,
  (revealed) => {
    if (revealed) {
      // 中文已揭示后收起英文提示，避免与正确答案抢注意力
      englishHintVisible.value = false
    }
  },
)

function resetEnglishHint() {
  englishHintVisible.value = false
  englishSenses.value = []
  englishSource.value = undefined
  englishError.value = ''
  isLoadingEnglish.value = false
}

function toggleCollapse() {
  if (!canToggle.value) return
  isCollapsed.value = !isCollapsed.value
  if (isCollapsed.value) {
    englishHintVisible.value = false
  }
}

async function handleGenerate(event: Event) {
  event.stopPropagation()
  await generateWithAi(props.word, props.gloss, { force: isRegenMode.value })
  if (sentences.value.length > 0) {
    isCollapsed.value = false
  }
}

async function revealEnglishHint() {
  if (isLoadingEnglish.value || !props.word) return
  englishHintVisible.value = true
  englishError.value = ''
  isLoadingEnglish.value = true
  try {
    const result = await fetchEnglishDefinitions(props.word)
    englishSenses.value = result?.senses ?? []
    englishSource.value = result?.source
    if (!englishSenses.value.length) {
      englishError.value = '暂无英文释义（外网词典不可达时需已配置 AI）'
    }
  } catch {
    englishSenses.value = []
    englishSource.value = undefined
    englishError.value = '加载失败，请稍后重试'
  } finally {
    isLoadingEnglish.value = false
  }
}
</script>

<template>
  <div
    class="example-panel"
    :class="{
      'is-open': !isCollapsed && sentences.length > 0,
      'has-en-hint': englishHintVisible && englishSenses.length > 0,
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
        <!-- 测验中不展示中译，避免对照偷懒；中译仍落库，详情页可用 -->
        <div class="example-panel__sentence" v-html="item.sentence" />
      </div>

      <div v-if="showEnglishHintEntry" class="example-panel__hint-entry">
        <button
          type="button"
          class="example-panel__hint-btn"
          @click="revealEnglishHint"
        >
          再提示 · 英文释义
        </button>
      </div>

      <div
        v-else-if="englishHintVisible && !definitionRevealed"
        class="example-panel__en-defs"
      >
        <p v-if="isLoadingEnglish" class="example-panel__en-status">
          <Loader2 :size="14" class="is-spinning" />
          加载英文释义…
        </p>
        <p v-else-if="englishError" class="example-panel__en-status is-error">
          {{ englishError }}
        </p>
        <template v-else>
          <div
            v-for="(sense, si) in englishSenses"
            :key="`${si}-${sense.partOfSpeech}`"
            class="example-panel__en-sense"
          >
            <span class="example-panel__en-pos">{{ sense.partOfSpeech }}</span>
            <ol class="example-panel__en-list">
              <li
                v-for="(def, di) in sense.definitions"
                :key="di"
                class="example-panel__en-item"
              >
                {{ def }}
              </li>
            </ol>
          </div>
          <p class="example-panel__en-attr">{{ englishSourceText }}</p>
        </template>
      </div>
    </div>

    <div v-if="error" class="example-panel__state example-panel__state--error">
      {{ error }}
    </div>
  </div>
</template>
