<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-vue-next'
import { useWordContextSentences } from '../composables/useWordContextSentences'

interface Props {
  word: string
  maxInitialDisplay?: number
}

const props = withDefaults(defineProps<Props>(), {
  maxInitialDisplay: 2
})

const { sentences, isLoading, error, findSentencesByWord } = useWordContextSentences()
const isCollapsed = ref(true)
const isExpanded = ref(false)

const displayedSentences = computed(() => {
  if (isExpanded.value || sentences.value.length <= props.maxInitialDisplay) {
    return sentences.value
  }
  return sentences.value.slice(0, props.maxInitialDisplay)
})

const hasMore = computed(() => sentences.value.length > props.maxInitialDisplay)

const headerLabel = computed(() => {
  if (isLoading.value) return '正在查找例句...'
  if (sentences.value.length === 0) return '查看例句语境'
  return `查看例句语境 (${sentences.value.length}条)`
})

onMounted(() => {
  if (props.word) {
    findSentencesByWord(props.word)
  }
})

watch(() => props.word, (newWord) => {
  if (newWord) {
    isCollapsed.value = true
    isExpanded.value = false
    findSentencesByWord(newWord)
  }
})

function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value
}

function toggleExpand() {
  isExpanded.value = !isExpanded.value
}
</script>

<template>
  <div class="example-panel" :class="{ 'is-open': !isCollapsed }">
    <button
      type="button"
      class="example-panel__header"
      @click="toggleCollapse"
    >
      <span>{{ headerLabel }}</span>
      <ChevronDown
        :size="14"
        class="example-panel__chevron"
        :class="{ 'is-rotated': !isCollapsed }"
      />
    </button>

    <div class="example-panel__content">
      <div v-if="isLoading" class="example-panel__state">
        <Loader2 :size="16" class="is-spinning" />
        <span>正在查找例句...</span>
      </div>

      <div v-else-if="error" class="example-panel__state example-panel__state--error">
        {{ error }}
      </div>

      <div v-else-if="sentences.length === 0" class="example-panel__state">
        暂无例句，去生成一篇文章吧～
      </div>

      <template v-else>
        <div
          v-for="(item, index) in displayedSentences"
          :key="`${item.articleId}-${index}`"
          class="example-panel__item"
        >
          <div class="example-panel__sentence" v-html="item.sentence"></div>
          <div v-if="item.translation" class="example-panel__translation">
            {{ item.translation }}
          </div>
          <div class="example-panel__source">来自：{{ item.articleTitle }}</div>
        </div>

        <button
          v-if="hasMore"
          type="button"
          class="example-panel__more"
          @click="toggleExpand"
        >
          <span v-if="isExpanded">
            收起部分
            <ChevronUp :size="14" />
          </span>
          <span v-else>
            展开全部 ({{ sentences.length }} 条)
            <ChevronDown :size="14" />
          </span>
        </button>
      </template>
    </div>
  </div>
</template>
