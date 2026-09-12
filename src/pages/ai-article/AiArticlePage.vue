<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ArrowLeft, Loader2, Volume2, X, RefreshCw, Sparkles, Pencil } from 'lucide-vue-next'

import { addArticle } from '@/db/repositories/articles.repository'
import { getApiConfig } from '@/db/repositories/api-config.repository'
import { getActivePromptConfig } from '@/db/repositories/prompt-config.repository'
import ParagraphTranslation from '@/pages/article-read/components/ParagraphTranslation.vue'
import DrawingToolbar from '@/pages/article-read/components/drawing/DrawingToolbar.vue'
import { useDrawingSession } from '@/pages/article-read/composables/useDrawingSession'
import {
  ensureLocalDictionary,
  lookupLocalDictionary,
} from '@/services/local-dictionary.service'

import '@/styles/pages/article-read-page.css'

interface Props {
  selectedWords: string[]
}

interface Article {
  id: string
  title: string
  content: string
  words: string[]
  date: string
  createdAt: number
  isNew?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  back: []
  startPractice: [words: string[]]
}>()

const isGenerating = ref(false)
const articles = ref<Article[]>([])
const showError = ref(false)
const errorMessage = ref('')
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
  await generateArticle()
})

function formatContentAsParagraphs(raw: string): string {
  if (raw.includes('<p>')) return raw
  return raw
    .split('\n\n')
    .filter(para => para.trim())
    .map(para => `<p>${para.trim()}</p>`)
    .join('\n')
}

function highlightWords(body: string, words: string[]): string {
  let result = body
  words.forEach(word => {
    const regex = new RegExp(`\\b(${word})\\b`, 'gi')
    result = result.replace(regex, '<mark>$1</mark>')
  })
  return result
}

async function generateArticle() {
  isGenerating.value = true
  showError.value = false

  try {
    const apiConfig = await getApiConfig()
    const promptConfig = await getActivePromptConfig()

    if (!apiConfig || !apiConfig.apiKey) {
      throw new Error('Please configure API key first')
    }

    const systemPrompt = buildSystemPrompt(promptConfig)
    const userPrompt = buildUserPrompt(props.selectedWords)

    const response = await fetch(`${apiConfig.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiConfig.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: apiConfig.textModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7
      })
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      throw new Error('No content returned from API')
    }

    const lines = content.split('\n').filter((line: string) => line.trim())
    const articleTitle = lines[0].replace(/^#+\s*/, '')
    let articleBody = lines.slice(1).join('\n\n')
    articleBody = highlightWords(articleBody, props.selectedWords)
    articleBody = formatContentAsParagraphs(articleBody)

    const today = new Date().toISOString().split('T')[0]
    const newArticle: Article = {
      id: `article-${Date.now()}`,
      title: articleTitle,
      content: articleBody,
      words: [...props.selectedWords],
      date: today,
      createdAt: Date.now(),
      isNew: articles.value.length > 0
    }

    articles.value.unshift(newArticle)

    setTimeout(() => {
      articles.value.forEach(article => {
        if (article.id !== newArticle.id) {
          article.isNew = false
        }
      })
    }, 3000)

    await saveArticleToDb(newArticle)
  } catch (error) {
    showError.value = true
    errorMessage.value = error instanceof Error ? error.message : 'Failed to generate article'
    console.error('Generation error:', error)
  } finally {
    isGenerating.value = false
  }
}

function buildSystemPrompt(promptConfig: any) {
  if (promptConfig && promptConfig.content) {
    return promptConfig.content
  }

  return `You are an expert English teacher creating engaging articles for exam preparation. Write naturally and coherently while incorporating the given vocabulary words seamlessly into the content. The article should be well-structured with a clear title.

Important: Start your response with a title on the first line, then write the article body.`
}

function buildUserPrompt(words: string[]) {
  const wordCount = Math.max(200, Math.min(800, words.length * 40))

  return `Write an approximately ${wordCount}-word article that naturally incorporates these vocabulary words: ${words.join(', ')}. 

Choose an appropriate theme based on the vocabulary provided. Make the article engaging, coherent, and educational. Use each word naturally in context.`
}

async function saveArticleToDb(article: Article) {
  try {
    await addArticle({
      id: String(article.id),
      title: String(article.title),
      content: String(article.content),
      words: article.words.map(w => String(w)),
      date: String(article.date),
      createdAt: Number(article.createdAt)
    })
  } catch (error) {
    console.error('Failed to save article:', error)
    throw error
  }
}

function startPractice() {
  emit('startPractice', props.selectedWords)
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
  } catch {
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
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(word)
    utterance.lang = 'en-US'
    window.speechSynthesis.speak(utterance)
  }
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
      <h1>AI Article</h1>
      <div class="article-read-header__actions">
        <button
          v-if="articles.length > 0"
          class="article-annotation-button"
          type="button"
          :class="{ 'is-active': isDrawingMode }"
          title="涂鸦批注"
          @click="toggleDrawingMode"
        >
          <Pencil :size="16" />
        </button>
        <button
          v-if="articles.length > 0"
          class="article-regenerate-button"
          type="button"
          :disabled="isGenerating"
          title="再生成一篇文章"
          @click="generateArticle"
        >
          <RefreshCw :size="16" :class="{ 'is-spinning': isGenerating }" />
        </button>
      </div>
    </header>

    <main class="article-read-content">
      <div v-if="isGenerating && articles.length === 0" class="article-read-loading">
        <Loader2 class="is-spinning" :size="32" />
        <p>正在生成文章…</p>
      </div>

      <div v-else-if="showError && articles.length === 0" class="article-read-error">
        <h3>生成失败</h3>
        <p>{{ errorMessage }}</p>
        <button type="button" @click="generateArticle">重试</button>
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
            <span class="article-timestamp">{{ formatTime(article.createdAt) }}</span>
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

          <div v-if="index === 0" class="article-read-practice">
            <p>读完了？来测测这些词汇吧</p>
            <button type="button" @click="startPractice">开始练习</button>
          </div>

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

            <div
              v-for="(meaning, idx) in wordDefinition.meanings"
              :key="idx"
              class="definition-card__meaning"
            >
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
