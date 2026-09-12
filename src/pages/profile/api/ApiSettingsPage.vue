<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { ArrowLeft, ArrowDown, ArrowUp, Book, Check, Eye, EyeOff, KeyRound, LoaderCircle, Plus, Save, Trash2, Volume2, Zap } from 'lucide-vue-next'

import { getApiConfig, saveApiConfig } from '@/db/repositories/api-config.repository'
import { deleteDictionaryApiConfig, getAllDictionaryApiConfigs, saveDictionaryApiConfig } from '@/db/repositories/dictionary-api-config.repository'
import type { DictionaryApiConfig } from '@/db/schema/database'
import { queryWordDefinition } from '@/services/dictionary-api.service'
import {
  getSpeechRate,
  getSelectedVoiceURI,
  loadSpeechVoices,
  setSpeechRate,
  setSpeechVoiceURI,
  speakText,
  speechSettings,
  stopSpeaking,
} from '@/services/speech.service'

import '@/styles/pages/profile/api-settings-page.css'

interface Provider {
  id: string
  name: string
  baseUrl: string
  model: string
}

interface ModelItem {
  id: string
}

interface DictProviderTemplate {
  provider: 'youdao' | 'iciba' | 'baidu' | 'custom'
  name: string
  endpoint: string
  requiresSecret: boolean
}

const emit = defineEmits<{
  back: []
}>()

const providers: Provider[] = [
  { id: 'deepseek', name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  { id: 'siliconflow', name: 'SiliconFlow', baseUrl: 'https://api.siliconflow.cn/v1', model: 'Qwen/Qwen2.5-72B-Instruct' },
  { id: 'custom', name: 'Custom', baseUrl: '', model: 'custom' }
]

const dictProviderTemplates: DictProviderTemplate[] = [
  { provider: 'youdao', name: '网易有道', endpoint: 'https://openapi.youdao.com/api', requiresSecret: true },
  { provider: 'iciba', name: '金山词霸', endpoint: 'http://dict-co.iciba.com/api/dictionary.php', requiresSecret: false },
  { provider: 'baidu', name: '百度翻译', endpoint: 'https://fanyi-api.baidu.com/api/trans/vip/translate', requiresSecret: true },
  { provider: 'custom', name: '自定义', endpoint: '', requiresSecret: false }
]

const selectedProvider = ref('deepseek')
const showApiKey = ref(false)
const isTesting = ref(false)
const isFetchingModels = ref(false)
const isFetchingVisionModels = ref(false)
const testResult = ref<{ success: boolean; latency: number } | null>(null)
const toastMessage = ref('')
const toastType = ref<'success' | 'error'>('success')
const customTextModel = ref('')
const fetchedModels = ref<ModelItem[]>([])
const fetchedVisionModels = ref<ModelItem[]>([])
const fetchStatusMessage = ref('')
const fetchStatusSuccess = ref(true)
const visionFetchStatusMessage = ref('')
const visionFetchStatusSuccess = ref(true)

const config = ref({
  baseUrl: 'https://api.deepseek.com/v1',
  apiKey: '',
  textModel: 'deepseek-chat',
  useIndependentVision: false,
  visionBaseUrl: 'https://api.openai.com/v1',
  visionApiKey: '',
  visionModel: 'gpt-4o-mini'
})

const dictionaryConfigs = ref<DictionaryApiConfig[]>([])
const showDictApiKey = ref<Record<string, boolean>>({})
const isTestingDict = ref<Record<string, boolean>>({})
const dictTestResults = ref<Record<string, { success: boolean; message: string }>>({})

const speechVoiceURI = ref(getSelectedVoiceURI())
const speechRateLocal = ref(getSpeechRate())
const speechVoices = computed(() => speechSettings.availableVoices.value)
const speechSupported = ref(typeof window !== 'undefined' && 'speechSynthesis' in window)
const previewWord = ref('vocabulary')

const effectiveTextModel = computed(() => config.value.textModel === 'custom' ? customTextModel.value : config.value.textModel)

onMounted(async () => {
  const savedConfig = await getApiConfig()
  if (savedConfig) {
    config.value = {
      baseUrl: savedConfig.baseUrl,
      apiKey: savedConfig.apiKey,
      textModel: savedConfig.textModel,
      useIndependentVision: savedConfig.useIndependentVision,
      visionBaseUrl: savedConfig.visionBaseUrl,
      visionApiKey: savedConfig.visionApiKey,
      visionModel: savedConfig.visionModel
    }
    if (savedConfig.apiKey) {
      await fetchModels()
      config.value.textModel = savedConfig.textModel
    }
    showToast('Config loaded')
  }
  await loadDictionaryConfigs()
  await loadSpeechVoices()
  speechVoiceURI.value = getSelectedVoiceURI()
  speechRateLocal.value = getSpeechRate()
})

onUnmounted(() => {
  stopSpeaking()
})

function onSpeechVoiceChange() {
  setSpeechVoiceURI(speechVoiceURI.value)
  showToast(speechVoiceURI.value ? '发音音色已保存' : '已改回自动选择')
}

function onSpeechRateChange() {
  setSpeechRate(speechRateLocal.value)
}

function previewSpeech() {
  const sample = previewWord.value.trim() || 'vocabulary'
  speakText(sample)
}

async function loadDictionaryConfigs() {
  dictionaryConfigs.value = await getAllDictionaryApiConfigs()
}

function showToast(message: string, type: 'success' | 'error' = 'success') {
  toastMessage.value = message
  toastType.value = type
  window.setTimeout(() => {
    toastMessage.value = ''
  }, 2500)
}

function selectProvider(providerId: string) {
  selectedProvider.value = providerId
  const provider = providers.find((item) => item.id === providerId)
  if (!provider || provider.id === 'custom') return
  config.value.baseUrl = provider.baseUrl
  config.value.textModel = provider.model
  fetchedModels.value = []
  fetchStatusMessage.value = ''
  showToast(`Loaded ${provider.name} preset`)
}

function resetBaseUrl() {
  config.value.baseUrl = 'https://api.deepseek.com/v1'
  showToast('Reset to default URL')
}

async function fetchModels() {
  if (!config.value.apiKey.trim()) {
    showToast('Enter API Key first', 'error')
    return
  }
  isFetchingModels.value = true
  fetchStatusMessage.value = ''
  const startedAt = performance.now()
  const url = `${config.value.baseUrl.trim().replace(/\/+$/, '')}/models`
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), 8000)
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${config.value.apiKey}`, 'Content-Type': 'application/json' },
      signal: controller.signal
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data: unknown = await response.json()
    const models = data && typeof data === 'object' && 'data' in data && Array.isArray(data.data)
      ? data.data.filter((item): item is { id: string } => typeof item === 'object' && item !== null && 'id' in item && typeof item.id === 'string').map((item) => ({ id: item.id }))
      : []
    if (!models.length) throw new Error('No models returned')
    fetchedModels.value = models
    config.value.textModel = models[0].id
    testResult.value = { success: true, latency: Math.round(performance.now() - startedAt) }
    fetchStatusSuccess.value = true
    fetchStatusMessage.value = `Fetched ${models.length} models`
    showToast('Models updated')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed'
    fetchStatusSuccess.value = false
    fetchStatusMessage.value = `Failed: ${message}`
    testResult.value = { success: false, latency: 0 }
    showToast('Fetch failed', 'error')
  } finally {
    window.clearTimeout(timeoutId)
    isFetchingModels.value = false
  }
}

async function fetchVisionModels() {
  const effectiveKey = config.value.visionApiKey.trim() || config.value.apiKey.trim()
  if (!effectiveKey) {
    showToast('Enter API Key first', 'error')
    return
  }
  isFetchingVisionModels.value = true
  visionFetchStatusMessage.value = ''
  const url = `${config.value.visionBaseUrl.trim().replace(/\/+$/, '')}/models`
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), 8000)
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${effectiveKey}`, 'Content-Type': 'application/json' },
      signal: controller.signal
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data: unknown = await response.json()
    const models = data && typeof data === 'object' && 'data' in data && Array.isArray(data.data)
      ? data.data.filter((item): item is { id: string } => typeof item === 'object' && item !== null && 'id' in item && typeof item.id === 'string').map((item) => ({ id: item.id }))
      : []
    if (!models.length) throw new Error('No models returned')
    fetchedVisionModels.value = models
    config.value.visionModel = models[0].id
    visionFetchStatusSuccess.value = true
    visionFetchStatusMessage.value = `Fetched ${models.length} vision models`
    showToast('Vision models updated')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed'
    visionFetchStatusSuccess.value = false
    visionFetchStatusMessage.value = `Failed: ${message}`
    showToast('Vision fetch failed', 'error')
  } finally {
    window.clearTimeout(timeoutId)
    isFetchingVisionModels.value = false
  }
}

async function testApiConnection() {
  isTesting.value = true
  await fetchModels()
  isTesting.value = false
}

async function saveConfiguration() {
  if (!config.value.baseUrl.trim() || !config.value.apiKey.trim() || !effectiveTextModel.value.trim()) {
    showToast('Complete all required fields', 'error')
    return
  }
  try {
    await saveApiConfig({
      baseUrl: config.value.baseUrl,
      apiKey: config.value.apiKey,
      textModel: effectiveTextModel.value,
      useIndependentVision: config.value.useIndependentVision,
      visionBaseUrl: config.value.visionBaseUrl,
      visionApiKey: config.value.visionApiKey,
      visionModel: config.value.visionModel
    })
    for (const dictConfig of dictionaryConfigs.value) {
      await saveDictionaryApiConfig(dictConfig)
    }
    showToast('Config saved successfully')
  } catch (error) {
    showToast('Failed to save config', 'error')
  }
}

function addDictionaryApi() {
  const newConfig: DictionaryApiConfig = {
    id: `dict-${Date.now()}`,
    name: '网易有道',
    enabled: true,
    priority: dictionaryConfigs.value.length + 1,
    apiKey: '',
    apiSecret: '',
    endpoint: 'https://openapi.youdao.com/api',
    provider: 'youdao',
    updatedAt: Date.now()
  }
  dictionaryConfigs.value.push(newConfig)
}

async function removeDictionaryApi(id: string) {
  try {
    await deleteDictionaryApiConfig(id)
    dictionaryConfigs.value = dictionaryConfigs.value.filter(c => c.id !== id)
    reorderPriorities()
    showToast('Dictionary API removed')
  } catch (error) {
    showToast('Failed to remove API', 'error')
  }
}

function moveDictionaryApiUp(index: number) {
  if (index === 0) return
  const temp = dictionaryConfigs.value[index]
  dictionaryConfigs.value[index] = dictionaryConfigs.value[index - 1]
  dictionaryConfigs.value[index - 1] = temp
  reorderPriorities()
}

function moveDictionaryApiDown(index: number) {
  if (index === dictionaryConfigs.value.length - 1) return
  const temp = dictionaryConfigs.value[index]
  dictionaryConfigs.value[index] = dictionaryConfigs.value[index + 1]
  dictionaryConfigs.value[index + 1] = temp
  reorderPriorities()
}

function reorderPriorities() {
  dictionaryConfigs.value.forEach((config, index) => {
    config.priority = index + 1
  })
}

function selectDictProvider(config: DictionaryApiConfig, template: DictProviderTemplate) {
  config.provider = template.provider
  config.name = template.name
  config.endpoint = template.endpoint
  if (!template.requiresSecret) {
    config.apiSecret = ''
  }
}

async function testDictionaryApi(config: DictionaryApiConfig) {
  if (!config.apiKey.trim()) {
    showToast('Enter API Key first', 'error')
    return
  }
  isTestingDict.value[config.id] = true
  dictTestResults.value[config.id] = { success: false, message: 'Testing...' }
  try {
    await saveDictionaryApiConfig(config)
    const result = await queryWordDefinition('hello')
    if (result) {
      dictTestResults.value[config.id] = { 
        success: true, 
        message: `Success: ${result.translation}` 
      }
      showToast('Connection test passed')
    } else {
      dictTestResults.value[config.id] = { 
        success: false, 
        message: 'Failed: No result returned' 
      }
      showToast('Connection test failed', 'error')
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    dictTestResults.value[config.id] = { 
      success: false, 
      message: `Error: ${message}` 
    }
    showToast('Connection test failed', 'error')
  } finally {
    isTestingDict.value[config.id] = false
  }
}


</script>

<template>
  <div class="api-settings-page">
    <header class="api-settings-header">
      <div class="api-settings-header__title">
        <button class="api-icon-button" type="button" @click="emit('back')">
          <ArrowLeft :size="17" />
        </button>
        <div>
          <h1>API Key & Model Config</h1>
          <p>Saved locally in browser only</p>
        </div>
      </div>
      <span class="api-connection-status" :class="{ 'is-connected': testResult?.success }">
        <span></span>
        {{ testResult?.success ? `${testResult.latency}ms` : 'Pending' }}
      </span>
    </header>

    <main class="api-settings-content">
      <section class="api-section">
        <span class="api-section__label">Quick Presets</span>
        <div class="api-provider-grid">
          <button v-for="provider in providers" :key="provider.id" class="api-provider" :class="{ 'is-selected': selectedProvider === provider.id }" type="button" @click="selectProvider(provider.id)">
            <span class="api-provider__mark">{{ provider.name.slice(0, 1) }}</span>
            <span>{{ provider.name }}</span>
          </button>
        </div>
      </section>

      <section class="api-card">
        <div class="api-card__heading">
          <div class="api-card__heading-mark"><KeyRound :size="16" /></div>
          <div><h2>Text Generation Model</h2><p>For articles and definitions</p></div>
          <span>Primary</span>
        </div>
        <label class="api-field">
          <span>API Base URL<button type="button" @click="resetBaseUrl">Reset</button></span>
          <input v-model="config.baseUrl" type="url" placeholder="https://api.deepseek.com/v1" />
        </label>
        <label class="api-field">
          <span>API Key</span>
          <span class="api-input-wrap">
            <input v-model="config.apiKey" :type="showApiKey ? 'text' : 'password'" placeholder="sk-xxxx" />
            <button type="button" @click="showApiKey = !showApiKey">
              <EyeOff v-if="showApiKey" :size="15" />
              <Eye v-else :size="15" />
            </button>
          </span>
        </label>
        <label class="api-field">
          <span>Model Name<button class="api-fetch-button" type="button" :disabled="isFetchingModels" @click="fetchModels">
              <LoaderCircle v-if="isFetchingModels" class="is-spinning" :size="13" />
              <span>{{ isFetchingModels ? 'Fetching...' : 'Fetch Models' }}</span>
            </button></span>
          <select v-model="config.textModel">
            <option v-for="model in fetchedModels" :key="model.id" :value="model.id">{{ model.id }}</option>
            <option v-if="!fetchedModels.length" value="deepseek-chat">deepseek-chat</option>
            <option v-if="!fetchedModels.length" value="gpt-4o-mini">gpt-4o-mini</option>
            <option value="custom">Custom</option>
          </select>
        </label>
        <input v-if="config.textModel === 'custom'" v-model="customTextModel" class="api-field__input" type="text" placeholder="Enter model ID" />
        <p v-if="fetchStatusMessage" class="api-feedback" :class="{ 'is-success': fetchStatusSuccess }">
          <Check v-if="fetchStatusSuccess" :size="13" />
          <span>{{ fetchStatusMessage }}</span>
        </p>
      </section>

      <section class="api-card">
        <div class="api-card__heading">
          <div class="api-card__heading-mark api-card__heading-mark--amber">&#9678;</div>
          <div><h2>Vision OCR Model</h2><p>For image text extraction</p></div>
        </div>
        <div class="api-toggle-row">
          <div><strong>Independent Vision API</strong><span>Separate vision config</span></div>
          <button class="api-toggle" :class="{ 'is-on': config.useIndependentVision }" type="button" @click="config.useIndependentVision = !config.useIndependentVision">
            <span></span>
          </button>
        </div>
        <div v-if="config.useIndependentVision" class="api-vision-fields">
          <label class="api-field">
            <span>Vision Base URL</span>
            <input v-model="config.visionBaseUrl" type="url" placeholder="https://api.openai.com/v1" />
          </label>
          <label class="api-field">
            <span>Vision API Key</span>
            <input v-model="config.visionApiKey" type="password" placeholder="Optional, reuse text key if empty" />
          </label>
          <label class="api-field">
            <span>Vision Model<button class="api-fetch-button" type="button" :disabled="isFetchingVisionModels" @click="fetchVisionModels">
                <LoaderCircle v-if="isFetchingVisionModels" class="is-spinning" :size="13" />
                <span>{{ isFetchingVisionModels ? 'Fetching...' : 'Fetch Models' }}</span>
              </button></span>
            <select v-model="config.visionModel">
              <option v-for="model in fetchedVisionModels" :key="model.id" :value="model.id">{{ model.id }}</option>
              <option v-if="!fetchedVisionModels.length" value="gpt-4o-mini">gpt-4o-mini</option>
              <option v-if="!fetchedVisionModels.length" value="gpt-4o">gpt-4o</option>
            </select>
          </label>
          <p v-if="visionFetchStatusMessage" class="api-feedback" :class="{ 'is-success': visionFetchStatusSuccess }">
            <Check v-if="visionFetchStatusSuccess" :size="13" />
            <span>{{ visionFetchStatusMessage }}</span>
          </p>
        </div>
      </section>

      <section class="api-card">
        <div class="api-card__heading">
          <div class="api-card__heading-mark"><Volume2 :size="16" /></div>
          <div>
            <h2>浏览器发音</h2>
            <p>选择系统自带英文音色，改善听筒朗读听感</p>
          </div>
        </div>

        <template v-if="speechSupported">
          <label class="api-field">
            <span>音色</span>
            <select v-model="speechVoiceURI" class="api-field__input" @change="onSpeechVoiceChange">
              <option value="">自动（优先自然英文）</option>
              <option
                v-for="voice in speechVoices"
                :key="voice.voiceURI"
                :value="voice.voiceURI"
              >
                {{ voice.label }}
              </option>
            </select>
          </label>

          <label class="api-field">
            <span>语速 {{ speechRateLocal.toFixed(2) }}</span>
            <input
              v-model.number="speechRateLocal"
              class="api-speech-rate"
              type="range"
              min="0.7"
              max="1.15"
              step="0.05"
              @change="onSpeechRateChange"
            />
          </label>

          <div class="api-speech-preview">
            <input
              v-model="previewWord"
              class="api-field__input"
              type="text"
              placeholder="试听单词"
              maxlength="40"
            />
            <button class="api-fetch-button" type="button" @click="previewSpeech">
              <Volume2 :size="14" />
              试听
            </button>
          </div>

          <p class="api-feedback is-success" style="opacity: 0.85">
            <span>提示：Windows 可优先试 Microsoft Aria / Jenny；手机可试 Google US English。列表来自本机系统，不同设备不同。</span>
          </p>
        </template>

        <p v-else class="api-feedback">
          <span>当前浏览器不支持语音合成</span>
        </p>
      </section>

      <section class="api-section">
        <div class="api-section__header">
          <div>
            <span class="api-section__label">Third-Party Dictionary APIs</span>
            <p class="api-section__desc">Priority order for word definitions (fallback to LLM if all fail)</p>
          </div>
          <button class="api-add-button" type="button" @click="addDictionaryApi">
            <Plus :size="14" />
            <span>Add API</span>
          </button>
        </div>

        <div v-if="dictionaryConfigs.length === 0" class="api-empty-state">
          <Book :size="32" />
          <p>No dictionary APIs configured</p>
          <span>Add at least one to enable automatic word definitions</span>
        </div>

        <div v-for="(dictConfig, index) in dictionaryConfigs" :key="dictConfig.id" class="api-dict-card">
          <div class="api-dict-card__header">
            <div class="api-dict-card__title">
              <Book :size="16" />
              <strong>API Source #{{ index + 1 }}</strong>
              <span class="api-dict-card__priority">Priority: {{ dictConfig.priority }}</span>
            </div>
            <div class="api-dict-card__actions">
              <button 
                type="button" 
                :disabled="index === 0" 
                @click="moveDictionaryApiUp(index)"
                title="Move up"
              >
                <ArrowUp :size="14" />
              </button>
              <button 
                type="button" 
                :disabled="index === dictionaryConfigs.length - 1" 
                @click="moveDictionaryApiDown(index)"
                title="Move down"
              >
                <ArrowDown :size="14" />
              </button>
              <button 
                type="button" 
                class="api-dict-card__delete" 
                @click="removeDictionaryApi(dictConfig.id)"
                title="Remove"
              >
                <Trash2 :size="14" />
              </button>
            </div>
          </div>

          <div class="api-toggle-row">
            <div><strong>Enable this API</strong><span>Use in word lookup</span></div>
            <button class="api-toggle" :class="{ 'is-on': dictConfig.enabled }" type="button" @click="dictConfig.enabled = !dictConfig.enabled">
              <span></span>
            </button>
          </div>

          <label class="api-field">
            <span>API Provider</span>
            <div class="api-provider-select">
              <button 
                v-for="template in dictProviderTemplates" 
                :key="template.provider"
                type="button"
                class="api-provider-option"
                :class="{ 'is-selected': dictConfig.provider === template.provider }"
                @click="selectDictProvider(dictConfig, template)"
              >
                {{ template.name }}
              </button>
            </div>
          </label>

          <label class="api-field">
            <span>API Name</span>
            <input v-model="dictConfig.name" type="text" placeholder="e.g., 网易有道" />
          </label>

          <label class="api-field">
            <span>API Key / App Key</span>
            <span class="api-input-wrap">
              <input 
                v-model="dictConfig.apiKey" 
                :type="showDictApiKey[dictConfig.id] ? 'text' : 'password'" 
                placeholder="Enter your API key" 
              />
              <button type="button" @click="showDictApiKey[dictConfig.id] = !showDictApiKey[dictConfig.id]">
                <EyeOff v-if="showDictApiKey[dictConfig.id]" :size="15" />
                <Eye v-else :size="15" />
              </button>
            </span>
          </label>

          <label v-if="dictConfig.provider === 'youdao' || dictConfig.provider === 'baidu'" class="api-field">
            <span>API Secret / App Secret</span>
            <span class="api-input-wrap">
              <input 
                v-model="dictConfig.apiSecret" 
                :type="showDictApiKey[dictConfig.id + '-secret'] ? 'text' : 'password'" 
                placeholder="Enter your API secret" 
              />
              <button type="button" @click="showDictApiKey[dictConfig.id + '-secret'] = !showDictApiKey[dictConfig.id + '-secret']">
                <EyeOff v-if="showDictApiKey[dictConfig.id + '-secret']" :size="15" />
                <Eye v-else :size="15" />
              </button>
            </span>
          </label>

          <label class="api-field">
            <span>Endpoint URL</span>
            <input v-model="dictConfig.endpoint" type="url" placeholder="https://openapi.youdao.com/api" />
          </label>

          <button 
            class="api-test-button" 
            type="button" 
            :disabled="isTestingDict[dictConfig.id]"
            @click="testDictionaryApi(dictConfig)"
          >
            <LoaderCircle v-if="isTestingDict[dictConfig.id]" class="is-spinning" :size="14" />
            <Zap v-else :size="14" />
            <span>{{ isTestingDict[dictConfig.id] ? 'Testing...' : 'Test Connection' }}</span>
          </button>

          <p 
            v-if="dictTestResults[dictConfig.id]" 
            class="api-feedback" 
            :class="{ 'is-success': dictTestResults[dictConfig.id].success }"
          >
            <Check v-if="dictTestResults[dictConfig.id].success" :size="13" />
            <span>{{ dictTestResults[dictConfig.id].message }}</span>
          </p>
        </div>
      </section>

      <section class="api-test-card">
        <div>
          <h2>Connection Test</h2>
          <p>Verify API key validity</p>
        </div>
        <button type="button" :disabled="isTesting" @click="testApiConnection">
          <LoaderCircle v-if="isTesting" class="is-spinning" :size="14" />
          <Zap v-else :size="14" />
          <span>{{ isTesting ? 'Testing...' : 'Test' }}</span>
        </button>
      </section>

    </main>

    <Transition name="api-toast">
      <div v-if="toastMessage" class="api-toast" :class="{ 'is-error': toastType === 'error' }">
        <Check :size="15" />
        <span>{{ toastMessage }}</span>
      </div>
    </Transition>
    <footer class="api-save-bar">
      <button type="button" @click="saveConfiguration">
        <Save :size="15" />
        <span>Save Config</span>
      </button>
    </footer>
  </div>
</template>
