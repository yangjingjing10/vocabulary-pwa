<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { ArrowLeft, Loader2, Volume2, X, RefreshCw, Sparkles, Pencil } from 'lucide-vue-next'

import { getArticle, getArticlesByDate, deleteArticle } from '@/db/repositories/articles.repository'
import type { Article } from '@/db/schema/database'
import ParagraphTranslation from './components/ParagraphTranslation.vue'
import DrawingToolbar from './components/drawing/DrawingToolbar.vue'
import ArticleDeleteConfirmModal from './components/ArticleDeleteConfirmModal.vue'
import { useDrawingSession } from './composables/useDrawingSession'
import { useArticleLongPress } from './composables/useArticleLongPress'
import {
  ensureLocalDictionary,
  lookupLocalDictionary,
} from '@/services/local-dictionary.service'
import { articleGenerationService } from '@/services/article-generation.service'
import { speakText } from '@/services/speech.service'

import '@/styles/pages/article-read-page.css'

interface Props {
  articleId: string
}

interface EnhancedArticle extends Article {
  isNew?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  back: []
}>()

const articles = ref<EnhancedArticle[]>([])
const isLoading = ref(true)
const generateError = ref('')
const showDefinition = ref(false)
const selectedWord = ref('')
const wordDefinition = ref<any>(null)
const isLoadingDefinition = ref(false)
const isDeleting = ref(false)
let pageAlive = true

const isGenerating = computed(() => articleGenerationService.isGenerating.value)

const {
  isActive: isDrawingMode,
  tool: drawingTool,
  color: drawingColor,
  width: drawingWidth,
  toggle: toggleDrawingMode,
  exit: exitDrawingMode,
  setTool: setDrawingTool,
  setColor: setDrawingColor,
  setWidth: setDrawingWidth
} = useDrawingSession()

const {
  pendingId: pendingDeleteId,
  onPointerDown: onArticlePointerDown,
  onPointerMove: onArticlePointerMove,
  onPointerUp: onArticlePointerUp,
  onContextMenu: onArticleContextMenu,
  close: closeDeleteConfirm,
} = useArticleLongPress(() => isDrawingMode.value || isGenerating.value || isDeleting.value)

const pendingDeleteArticle = computed(
  () => articles.value.find((article) => article.id === pendingDeleteId.value) ?? null,
)

onMounted(async () => {
  await loadArticle()
})

onUnmounted(() => {
  pageAlive = false
})

async function loadArticle() {
  try {
    const data = await getArticle(props.articleId)
    if (!data) return

    const sameDay = await getArticlesByDate(data.date)
    const list = (sameDay.length > 0 ? sameDay : [data])
      .slice()
      .sort((a, b) => b.createdAt - a.createdAt)
    articles.value = list
  } catch (error) {
    console.error('Failed to load article:', error)
  } finally {
    isLoading.value = false
  }
}

async function regenerateArticle() {
  if (isGenerating.value || articles.value.length === 0) return

  const source =
    articles.value.find((article) => article.id === props.articleId) ??
    articles.value[articles.value.length - 1]
  const words = Array.from(source.words ?? [], (word) => String(word))
  if (!words.length) {
    generateError.value = '当前文章没有可用于生成的词汇'
    return
  }

  generateError.value = ''
  const article = await articleGenerationService.start(words, {
    session: 'none',
    date: source.date,
  })
  if (!pageAlive) return

  if (!article) {
    if (articleGenerationService.status.value === 'error') {
      generateError.value = articleGenerationService.lastError.value || '生成失败'
    }
    return
  }

  articles.value.unshift({ ...article, isNew: true })
  window.setTimeout(() => {
    if (!pageAlive) return
    articles.value.forEach((item) => {
      if (item.id !== article.id) item.isNew = false
    })
  }, 3000)
}

async function confirmDeleteArticle() {
  const target = pendingDeleteArticle.value
  if (!target || isDeleting.value) return

  isDeleting.value = true
  try {
    articles.value = articles.value.filter((article) => article.id !== target.id)
    closeDeleteConfirm()
    await nextTick()
    await deleteArticle(target.id)
    articleGenerationService.removeFromSession(target.id)
    if (articles.value.length === 0) {
      emit('back')
    }
  } catch (error) {
    console.error('Failed to delete article:', error)
    generateError.value = '删除失败，请重试'
    closeDeleteConfirm()
  } finally {
    isDeleting.value = false
  }
}


async function handleWordClick(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (target.tagName === 'MARK') {
    const word = target.textContent?.trim().toLowerCase()
    if (word) {
      selectedWord.value = word
      showDefinition.value = true
      await fetchDefinition(word)
    }
  }
}

async function fetchDefinition(word: string) {
  isLoadingDefinition.value = true
  wordDefinition.value = null

  try {
    await ensureLocalDictionary()
    const local = await lookupLocalDictionary(word)
    if (local) {
      wordDefinition.value = {
        word: local.word,
        phonetic: local.phonetic ? `/${local.phonetic}/` : '',
        meanings: [{
          partOfSpeech: local.pos || local.tag || '',
          definition: local.translation,
          example: '',
        }],
      }
      return
    }

    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`)

    if (response.ok) {
      const data = await response.json()
      wordDefinition.value = {
        word: data[0].word,
        phonetic: data[0].phonetic || data[0].phonetics?.[0]?.text || '',
        meanings: data[0].meanings.slice(0, 2).map((m: any) => ({
          partOfSpeech: m.partOfSpeech,
          definition: m.definitions[0].definition,
          example: m.definitions[0].example
        }))
      }
    } else {
      wordDefinition.value = {
        word,
        phonetic: '',
        meanings: [{
          partOfSpeech: '',
          definition: '本地词库与在线词典均未找到该词。',
          example: ''
        }]
      }
    }
  } catch (error) {
    wordDefinition.value = {
      word,
      phonetic: '',
      meanings: [{
        partOfSpeech: '',
        definition: '查词失败，请稍后重试。',
        example: ''
      }]
    }
  } finally {
    isLoadingDefinition.value = false
  }
}

function closeDefinition() {
  showDefinition.value = false
  wordDefinition.value = null
}

function playAudio(word: string) {
  speakText(word)
}

function formatTime(timestamp: number) {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins} 分钟前`
  
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours} 小时前`
  
  return date.toLocaleString('zh-CN', { 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}
</script>

<template>
  <div class="article-read-page" :class="{ 'is-drawing-mode': isDrawingMode }">
    <header class="article-read-header">
      <button class="article-read-icon-button" type="button" @click="emit('back')">
        <ArrowLeft :size="18" />
      </button>
      <h1>Read Article</h1>
      <div class="article-read-header__actions">
        <button 
          class="article-annotation-button" 
          type="button" 
          :class="{ 'is-active': isDrawingMode }"
          @click="toggleDrawingMode"
          title="涂鸦批注"
        >
          <Pencil :size="16" />
        </button>
        <button 
          v-if="articles.length > 0" 
          class="article-regenerate-button" 
          type="button" 
          :disabled="isGenerating"
          @click="regenerateArticle"
          title="再生成一篇文章"
        >
          <RefreshCw :size="16" :class="{ 'is-spinning': isGenerating }" />
        </button>
      </div>
    </header>

    <main class="article-read-content">
      <div v-if="isLoading" class="article-read-loading">
        <Loader2 class="is-spinning" :size="32" />
        <p>Loading article...</p>
      </div>

      <div v-else class="articles-container">
        <div v-if="isGenerating" class="article-generating-indicator">
          <Loader2 class="is-spinning" :size="20" />
          <span>正在生成新文章...</span>
        </div>

        <p v-if="generateError" class="article-inline-error">{{ generateError }}</p>

        <article 
          v-for="(article, index) in articles" 
          :key="article.id" 
          class="article-read-body"
          :class="{ 'is-new': article.isNew }"
        >
          <div
            class="article-read-heading"
            @pointerdown="onArticlePointerDown(article.id, $event)"
            @pointermove="onArticlePointerMove"
            @pointerup="onArticlePointerUp"
            @pointercancel="onArticlePointerUp"
            @pointerleave="onArticlePointerUp"
            @contextmenu="onArticleContextMenu(article.id, $event)"
          >
            <div v-if="articles.length > 1" class="article-meta">
              <span v-if="article.isNew" class="article-badge article-badge--new">
                <Sparkles :size="14" />
                新生成
              </span>
              <span v-if="article.createdAt" class="article-timestamp">
                {{ formatTime(article.createdAt) }}
              </span>
            </div>

            <h2 class="article-read-title">{{ article.title }}</h2>
          </div>
          
          <ParagraphTranslation 
            :article-id="article.id"
            :content="article.content"
            :drawing-active="isDrawingMode"
            :drawing-tool="drawingTool"
            :drawing-color="drawingColor"
            :drawing-width="drawingWidth"
            @word-click="handleWordClick"
          />

          <div v-if="index < articles.length - 1" class="article-separator"></div>
        </article>
      </div>
    </main>

    <ArticleDeleteConfirmModal
      :show="!!pendingDeleteArticle"
      :title="pendingDeleteArticle?.title ?? ''"
      @close="closeDeleteConfirm"
      @confirm="confirmDeleteArticle"
    />

    <DrawingToolbar
      v-if="isDrawingMode"
      :tool="drawingTool"
      :color="drawingColor"
      :width="drawingWidth"
      @update:tool="setDrawingTool"
      @update:color="setDrawingColor"
      @update:width="setDrawingWidth"
      @close="exitDrawingMode"
    />

    <Transition name="definition-modal">
      <div v-if="showDefinition" class="definition-modal" @click.self="closeDefinition">
        <div class="definition-card">
          <div class="definition-card__header">
            <h3>{{ selectedWord }}</h3>
            <button type="button" @click="closeDefinition">
              <X :size="16" />
            </button>
          </div>

          <div v-if="isLoadingDefinition" class="definition-card__loading">
            <Loader2 class="is-spinning" :size="24" />
            <span>Loading definition...</span>
          </div>

          <div v-else-if="wordDefinition" class="definition-card__content">
            <div class="definition-card__phonetic">
              <span v-if="wordDefinition.phonetic">{{ wordDefinition.phonetic }}</span>
              <button type="button" @click="playAudio(selectedWord)">
                <Volume2 :size="14" />
              </button>
            </div>

            <div v-for="(meaning, idx) in wordDefinition.meanings" :key="idx" class="definition-card__meaning">
              <span class="definition-card__pos">{{ meaning.partOfSpeech }}</span>
              <p class="definition-card__def">{{ meaning.definition }}</p>
              <p v-if="meaning.example" class="definition-card__example">"{{ meaning.example }}"</p>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
