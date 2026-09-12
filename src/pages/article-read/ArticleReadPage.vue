<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ArrowLeft, Loader2, Volume2, X, RefreshCw, Sparkles, Pencil } from 'lucide-vue-next'

import { getArticle, addArticle } from '@/db/repositories/articles.repository'
import type { Article } from '@/db/schema/database'
import ParagraphTranslation from './components/ParagraphTranslation.vue'
import DrawingToolbar from './components/drawing/DrawingToolbar.vue'
import { useDrawingSession } from './composables/useDrawingSession'
import {
  ensureLocalDictionary,
  lookupLocalDictionary,
} from '@/services/local-dictionary.service'
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
const isGenerating = ref(false)
const showDefinition = ref(false)
const selectedWord = ref('')
const wordDefinition = ref<any>(null)
const isLoadingDefinition = ref(false)

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

onMounted(async () => {
  await loadArticle()
})

async function loadArticle() {
  try {
    const data = await getArticle(props.articleId)
    if (data) {
      articles.value = [data]
    }
  } catch (error) {
    console.error('Failed to load article:', error)
  } finally {
    isLoading.value = false
  }
}

async function regenerateArticle() {
  if (isGenerating.value || articles.value.length === 0) return
  
  isGenerating.value = true
  
  try {
    const originalArticle = articles.value[articles.value.length - 1]
    const words = originalArticle.words || []
    
    // 🔧 测试模式：生成模拟文章，不调用 API（节省 token）
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const articleTitle = `测试文章 - ${new Date().toLocaleTimeString('zh-CN')}`
    const articleBody = `<p>This is a <mark>test</mark> paragraph with some vocabulary words. The purpose of this demo is to verify the regeneration functionality without consuming API tokens.</p>

<p>Another paragraph here. We can include more <mark>words</mark> from the vocabulary list to make it look realistic. This helps us test the layout and interaction before enabling the real API calls.</p>

<p>A third paragraph to demonstrate multiple sections. The <mark>article</mark> should display properly with all the styling and features we've implemented.</p>`
    
    const newArticle: EnhancedArticle = {
      id: `article-${Date.now()}`,
      title: articleTitle,
      content: articleBody,
      words: words,
      date: new Date().toISOString().split('T')[0],
      createdAt: Date.now(),
      isNew: true
    }
    
    articles.value.unshift(newArticle)
    
    setTimeout(() => {
      articles.value.forEach(article => {
        if (article.id !== newArticle.id) {
          article.isNew = false
        }
      })
    }, 3000)
    
    await addArticle(newArticle)
    
  } catch (error) {
    console.error('Failed to regenerate article:', error)
    alert('生成失败：' + (error instanceof Error ? error.message : '未知错误'))
  } finally {
    isGenerating.value = false
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

        <article 
          v-for="(article, index) in articles" 
          :key="article.id" 
          class="article-read-body"
          :class="{ 'is-new': article.isNew }"
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
