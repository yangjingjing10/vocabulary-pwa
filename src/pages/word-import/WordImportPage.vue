<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowLeft, Camera, Check, FileText, Image, Loader2, Save, Trash2, Upload } from 'lucide-vue-next'

import { addWord } from '@/db/repositories/words.repository'
import type { VocabularyWord } from '@/db/schema/database'
import { resolveDefinitionsForImport } from '@/services/dictionary-api.service'
import { todayLocalDate } from '@/utils/localDate'

import '@/styles/pages/word-import-page.css'

interface WordItem {
  id: string
  word: string
  source: 'ocr' | 'manual' | 'file'
}

const POS_PREFIX_RE = /^(n|v|vt|vi|a|adj|adv|ad|prep|conj|pron|num|int|aux|art|pl)\.\s*/i

function formatPhonetic(phonetic: string | undefined): string | undefined {
  const raw = phonetic?.trim()
  if (!raw) return undefined
  if (raw.startsWith('/') && raw.endsWith('/')) return raw
  return `/${raw.replace(/^\/+|\/+$/g, '')}/`
}

/** 统一拆出卡片用的 phonetic / pos / translation，避免词性叠写 */
function enrichDefinition(fields: {
  phonetic?: string
  pos?: string
  translation?: string
}): Pick<VocabularyWord, 'phonetic' | 'pos' | 'translation'> {
  const phonetic = formatPhonetic(fields.phonetic)

  // 兼容词典里字面量 \n
  let gloss = (fields.translation || '').replace(/\\n/g, '\n').split(/\r?\n/)[0]?.trim() || ''
  gloss = gloss.replace(/\[[^\]]+\]/g, '').trim()

  let pos = fields.pos?.trim() || ''
  if (pos && !pos.endsWith('.')) pos += '.'

  if (pos) {
    const escaped = pos.replace(/\./g, '\\.')
    gloss = gloss.replace(new RegExp(`^${escaped}\\s*`, 'i'), '')
  } else {
    const match = gloss.match(POS_PREFIX_RE)
    if (match) {
      pos = `${match[1].toLowerCase()}.`
      gloss = gloss.slice(match[0].length)
    }
  }

  gloss = gloss.trim()

  return {
    ...(phonetic ? { phonetic } : {}),
    ...(pos ? { pos } : {}),
    ...(gloss ? { translation: gloss } : {}),
  }
}

const props = defineProps<{
  importType: 'camera' | 'upload' | 'manual'
}>()

const emit = defineEmits<{
  back: []
  save: [words: string[]]
}>()

const isProcessing = ref(false)
const processingHint = ref('Processing OCR...')
const ocrResult = ref('')
const manualInput = ref('')
const useManualMode = ref(props.importType === 'manual')
const words = ref<WordItem[]>([])
const toastMessage = ref('')

const hasContent = computed(() => ocrResult.value.trim() || manualInput.value.trim() || words.value.length > 0)

function showToast(message: string) {
  toastMessage.value = message
  window.setTimeout(() => {
    toastMessage.value = ''
  }, 2000)
}

async function handleCapture() {
  try {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.capture = 'environment'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        await processImage(file)
      }
    }
    input.click()
  } catch (error) {
    showToast('Cannot access camera')
  }
}

async function handleFileUpload() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*,.txt'
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return

    if (file.type.startsWith('image/')) {
      await processImage(file)
    } else if (file.type === 'text/plain') {
      await processText(file)
    }
  }
  input.click()
}

async function processImage(file: File) {
  isProcessing.value = true
  processingHint.value = 'Processing OCR...'
  try {
    // TODO: Call real OCR API here
    await new Promise(resolve => setTimeout(resolve, 1500))
    ocrResult.value = ''
    showToast('Image uploaded, OCR API integration needed')
  } catch (error) {
    showToast('OCR failed, please retry')
  } finally {
    isProcessing.value = false
  }
}

async function processText(file: File) {
  isProcessing.value = true
  processingHint.value = 'Reading file...'
  try {
    const text = await file.text()
    manualInput.value = text
    showToast('File imported successfully')
  } catch (error) {
    showToast('File read failed')
  } finally {
    isProcessing.value = false
  }
}

function extractWords() {
  const source = useManualMode.value ? manualInput.value : ocrResult.value
  if (!source.trim()) {
    showToast('Please input or scan words first')
    return
  }

  const extracted = source
    .split(/[\s\n,]+/)
    .map(w => w.trim().toLowerCase())
    .filter(w => /^[a-z]+$/.test(w))
    .filter((w, i, arr) => arr.indexOf(w) === i)

  const sourceType: 'ocr' | 'manual' | 'file' = useManualMode.value ? 'manual' : (props.importType === 'upload' ? 'file' : 'ocr')
  
  words.value = extracted.map(word => ({
    id: `${Date.now()}-${Math.random()}`,
    word,
    source: sourceType
  }))

  showToast(`Extracted ${words.value.length} words`)
}

function removeWord(id: string) {
  words.value = words.value.filter(w => w.id !== id)
}

async function confirmSave() {
  if (words.value.length === 0) {
    showToast('Please extract words first')
    return
  }

  isProcessing.value = true
  processingHint.value = 'Matching local dictionary...'
  try {
    const wordList = words.value.map((w) => w.word)
    const { definitions, matchedLocal, filledRemote, filledPhrases, missed } = await resolveDefinitionsForImport(
      wordList,
      (phase, done, total, hint) => {
        if (phase === 'local') {
          processingHint.value = `本地词典匹配 ${done}/${total}`
        } else if (phase === 'phrases') {
          processingHint.value = hint
            ? `${hint}（${done}/${total}）`
            : `补全固定搭配 ${done}/${total}`
        } else {
          processingHint.value = hint
            ? `${hint}（${done}/${total}）`
            : `补全释义 ${done}/${total}`
        }
      },
    )

    processingHint.value = 'Saving words...'
    const today = todayLocalDate()
    let withDefs = 0

    for (const item of words.value) {
      const wordData: VocabularyWord = {
        id: item.id,
        word: item.word,
        source: item.source,
        addedAt: Date.now(),
        date: today,
      }

      const raw = definitions.get(item.word.toLowerCase())
      if (raw?.translation) {
        Object.assign(wordData, enrichDefinition(raw))
        if (wordData.translation) withDefs += 1
      }
      if (raw?.phrases?.length) {
        wordData.phrases = raw.phrases
      }

      await addWord(wordData)
    }

    emit('save', words.value.map((w) => w.word))

    const phraseNote = filledPhrases > 0 ? `，短语补全 ${filledPhrases}` : ''
    if (missed > 0) {
      showToast(
        `已保存 ${words.value.length} 词（本地 ${matchedLocal}，API/AI 补全 ${filledRemote}${phraseNote}，仍缺 ${missed}）`,
      )
    } else if (filledRemote > 0 || filledPhrases > 0) {
      showToast(
        `已保存 ${words.value.length} 词（本地 ${matchedLocal}，API/AI 补全 ${filledRemote}${phraseNote}）`,
      )
    } else {
      showToast(`已保存 ${withDefs} 个带释义单词`)
    }
  } catch (error) {
    showToast('Failed to save words')
    console.error('Save error:', error)
  } finally {
    isProcessing.value = false
  }
}
</script>

<template>
  <div class="word-import-page">
    <header class="import-header">
      <button class="import-icon-button" type="button" aria-label="Back" @click="emit('back')">
        <ArrowLeft :size="20" />
      </button>
      <div class="import-header__title">
        <h1>{{ importType === 'camera' ? 'Camera OCR' : importType === 'manual' ? 'Manual Input' : 'Import File' }}</h1>
        <p>Edit and save to vocabulary</p>
      </div>
    </header>

    <main class="import-content">
      <section v-if="!hasContent" class="import-empty">
        <button v-if="importType === 'camera'" class="import-capture-button" type="button" @click="handleCapture">
          <Camera :size="32" />
          <span>Open Camera</span>
        </button>
        <button v-else-if="importType === 'upload'" class="import-capture-button" type="button" @click="handleFileUpload">
          <Upload :size="32" />
          <span>Select Image or Document</span>
        </button>
        <div v-else class="import-editor">
          <textarea v-model="manualInput" placeholder="Enter words separated by space or newline" rows="12" autofocus></textarea>
        </div>
        <p v-if="importType !== 'manual'" class="import-hint">Or manually input words</p>
        <button v-if="importType !== 'manual'" class="import-text-button" type="button" @click="useManualMode = true">Manual Input</button>
        <button v-if="importType === 'manual' && !hasContent" class="import-extract-button" type="button" @click="extractWords">
          <Check :size="18" />
          <span>Extract Words</span>
        </button>
      </section>

      <section v-else class="import-result">
        <div v-if="importType !== 'manual'" class="import-mode-toggle">
          <button :class="{ 'is-active': !useManualMode }" type="button" @click="useManualMode = false">
            <Image :size="16" />
            <span>AI OCR Result</span>
          </button>
          <button :class="{ 'is-active': useManualMode }" type="button" @click="useManualMode = true">
            <FileText :size="16" />
            <span>Manual Input</span>
          </button>
        </div>

        <div class="import-editor">
          <textarea v-if="useManualMode || importType === 'manual'" v-model="manualInput" placeholder="Enter words separated by space or newline" rows="8"></textarea>
          <textarea v-else v-model="ocrResult" placeholder="AI OCR result will show here" rows="8" :disabled="isProcessing"></textarea>
        </div>

        <button class="import-extract-button" type="button" :disabled="isProcessing" @click="extractWords">
          <Check :size="18" />
          <span>Extract Words</span>
        </button>

        <div v-if="words.length > 0" class="import-words">
          <div class="import-words__header">
            <strong>Extracted {{ words.length }} words</strong>
            <button type="button" @click="words = []">Clear</button>
          </div>
          <div class="import-word-list">
            <div v-for="item in words" :key="item.id" class="import-word-item">
              <span>{{ item.word }}</span>
              <button type="button" aria-label="Delete" @click="removeWord(item.id)">
                <Trash2 :size="14" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>

    <Transition name="import-toast">
      <div v-if="toastMessage" class="import-toast">{{ toastMessage }}</div>
    </Transition>

    <footer v-if="words.length > 0" class="import-save-bar">
      <button type="button" @click="confirmSave">
        <Save :size="16" />
        <span>Save {{ words.length }} words to vocabulary</span>
      </button>
    </footer>

    <div v-if="isProcessing" class="import-loading">
      <Loader2 class="is-spinning" :size="32" />
      <span>{{ processingHint }}</span>
    </div>
  </div>
</template>
