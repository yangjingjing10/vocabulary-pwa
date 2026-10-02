<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { ArrowLeft, ArrowDown, ArrowUp, Book, Check, Eye, EyeOff, KeyRound, LoaderCircle, Play, Plus, Save, Square, Trash2, Volume2, Zap } from 'lucide-vue-next'

import { getApiConfig, saveApiConfig } from '@/db/repositories/api-config.repository'
import { deleteDictionaryApiConfig, getAllDictionaryApiConfigs, saveDictionaryApiConfig } from '@/db/repositories/dictionary-api-config.repository'
import type { DictionaryApiConfig } from '@/db/schema/database'
import { queryWordDefinition } from '@/services/dictionary-api.service'
import {
  examplePrefetchService,
  type ExamplePrefetchLog,
  type ExamplePrefetchStatus,
} from '@/services/example-prefetch.service'
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
  /** 选中时自动填入；Ollama 任意非空即可 */
  apiKey?: string
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
  {
    id: 'ollama',
    name: 'Ollama',
    // 占位：请改成电脑局域网 IP；手机与电脑须同一 Wi‑Fi
    baseUrl: 'http://192.168.1.100:11434/v1',
    model: 'qwen2.5',
    apiKey: 'ollama',
  },
  { id: 'custom', name: 'Custom', baseUrl: '', model: 'custom' },
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

const prefetchStatus = ref<ExamplePrefetchStatus>('idle')
const prefetchDone = ref(0)
const prefetchTotal = ref(0)
const prefetchCurrentWord = ref('')
const prefetchLogs = ref<ExamplePrefetchLog[]>([])
let unsubscribePrefetch: (() => void) | null = null

const prefetchStatusLabel = computed(() => {
  if (prefetchStatus.value === 'running') return '生成中'
  if (prefetchStatus.value === 'paused') return '已暂停'
  return '空闲'
})
const prefetchProgressText = computed(() => {
  if (prefetchTotal.value <= 0) return `${prefetchDone.value} / —`
  return `${prefetchDone.value} / ${prefetchTotal.value}`
})
const prefetchIsRunning = computed(() => prefetchStatus.value === 'running')

const effectiveTextModel = computed(() => config.value.textModel === 'custom' ? customTextModel.value : config.value.textModel)
const isOllama = computed(() => selectedProvider.value === 'ollama' || /:11434\b/i.test(config.value.baseUrl))
const effectiveApiKey = computed(() => {
  const key = config.value.apiKey.trim()
  if (key) return key
  return isOllama.value ? 'ollama' : ''
})

function syncPrefetchLogs() {
  prefetchLogs.value = examplePrefetchService.getLogs()
}

function formatPrefetchTime(at: number) {
  const d = new Date(at)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

function startPrefetch() {
  examplePrefetchService.kick({ delayMs: 0 })
}

function stopPrefetch() {
  examplePrefetchService.stop()
}

function detectProviderFromUrl(baseUrl: string): string {
  const url = baseUrl.trim().toLowerCase()
  if (/:11434\b/.test(url) || url.includes('ollama')) return 'ollama'
  if (url.includes('deepseek')) return 'deepseek'
  if (url.includes('openai.com')) return 'openai'
  if (url.includes('siliconflow')) return 'siliconflow'
  if (!url) return 'custom'
  return 'custom'
}

onMounted(async () => {
  const snap = examplePrefetchService.snapshot
  prefetchStatus.value = snap.status
  prefetchDone.value = snap.done
  prefetchTotal.value = snap.total
  prefetchCurrentWord.value = snap.currentWord
  syncPrefetchLogs()
  unsubscribePrefetch = examplePrefetchService.subscribe((event) => {
    prefetchStatus.value = event.status
    prefetchDone.value = event.done
    prefetchTotal.value = event.total
    prefetchCurrentWord.value = event.currentWord ?? ''
    syncPrefetchLogs()
  })

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
    selectedProvider.value = detectProviderFromUrl(savedConfig.baseUrl)
    if (savedConfig.apiKey || isOllama.value) {
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
  unsubscribePrefetch?.()
  unsubscribePrefetch = null
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
  if (provider.apiKey) {
    config.value.apiKey = provider.apiKey
  }
  fetchedModels.value = []
  fetchStatusMessage.value = ''
  showToast(`Loaded ${provider.name} preset`)
}

function resetBaseUrl() {
  const provider = providers.find((item) => item.id === selectedProvider.value)
  config.value.baseUrl = provider?.baseUrl || 'https://api.deepseek.com/v1'
  showToast('Reset to preset URL')
}

async function fetchModels() {
  const apiKey = effectiveApiKey.value
  if (!apiKey) {
    showToast('Enter API Key first', 'error')
    return
  }
  if (!config.value.baseUrl.trim()) {
    showToast('Enter Base URL first', 'error')
    return
  }
  if (!config.value.apiKey.trim() && isOllama.value) {
    config.value.apiKey = 'ollama'
  }
  isFetchingModels.value = true
  fetchStatusMessage.value = ''
  const startedAt = performance.now()
  const url = `${config.value.baseUrl.trim().replace(/\/+$/, '')}/models`
  const controller = new AbortController()
  // 局域网 / 冷启动 Ollama 可能稍慢
  const timeoutMs = isOllama.value ? 20000 : 8000
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      signal: controller.signal
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data: unknown = await response.json()
    const models = data && typeof data === 'object' && 'data' in data && Array.isArray(data.data)
      ? data.data.filter((item): item is { id: string } => typeof item === 'object' && item !== null && 'id' in item && typeof item.id === 'string').map((item) => ({ id: item.id }))
      : []
    if (!models.length) throw new Error('No models returned')
    fetchedModels.value = models
    const preferred =
      models.find((m) => /qwen2\.5/i.test(m.id)) ||
      models.find((m) => /qwen/i.test(m.id)) ||
      models[0]
    config.value.textModel = preferred!.id
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
  if (isOllama.value && !config.value.apiKey.trim()) {
    config.value.apiKey = 'ollama'
  }
  if (!config.value.baseUrl.trim() || !effectiveApiKey.value || !effectiveTextModel.value.trim()) {
    showToast('Complete all required fields', 'error')
    return
  }
  try {
    await saveApiConfig({
      baseUrl: config.value.baseUrl,
      apiKey: effectiveApiKey.value,
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

        <div v-if="isOllama" class="api-ollama-tip">
          <strong>手机连电脑 Ollama（Qwen2.5）</strong>
          <ol>
            <li>电脑安装 <a href="https://ollama.com" target="_blank" rel="noopener">Ollama</a>，执行：<code>ollama pull qwen2.5</code></li>
            <li>让 Ollama 监听局域网（默认只认本机）。Windows 可设用户环境变量后<strong>重启 Ollama</strong>：
              <code>OLLAMA_HOST=0.0.0.0:11434</code>
              <code>OLLAMA_ORIGINS=*</code>
            </li>
            <li>电脑查局域网 IP（PowerShell：<code>ipconfig</code> 看无线网卡 IPv4），例如 <code>192.168.1.23</code></li>
            <li>下方 Base URL 改成：<code>http://你的IP:11434/v1</code>（须带 <code>/v1</code>）</li>
            <li>手机与电脑连<strong>同一 Wi‑Fi</strong>；Windows 防火墙放行 11434 端口</li>
            <li>点 Fetch Models → 选中 qwen2.5 → Save</li>
          </ol>
          <p class="api-ollama-tip__warn">
            若 App 是用 <strong>https://</strong> 打开的（如线上部署），浏览器会拦截访问局域网 http，连不上。
            请用电脑局域网 http 地址打开本 App，或给 Ollama 套一层 https 隧道后再填地址。
          </p>
        </div>

        <label class="api-field">
          <span>API Base URL<button type="button" @click="resetBaseUrl">Reset</button></span>
          <input
            v-model="config.baseUrl"
            type="url"
            :placeholder="isOllama ? 'http://192.168.1.23:11434/v1' : 'https://api.deepseek.com/v1'"
          />
        </label>
        <label class="api-field">
          <span>{{ isOllama ? 'API Key（Ollama 任意填写）' : 'API Key' }}</span>
          <span class="api-input-wrap">
            <input
              v-model="config.apiKey"
              :type="showApiKey ? 'text' : 'password'"
              :placeholder="isOllama ? 'ollama' : 'sk-xxxx'"
            />
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
            <option v-if="!fetchedModels.length" value="qwen2.5">qwen2.5</option>
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

      <section class="api-card api-prefetch-console">
        <div class="api-card__heading">
          <div class="api-card__heading-mark"><Zap :size="16" /></div>
          <div>
            <h2>AI 后台控制台</h2>
            <p>查看例句静默预生成进度（不干扰测验页手动生成）</p>
          </div>
          <span
            class="api-prefetch-status"
            :class="{ 'is-running': prefetchIsRunning }"
          >
            {{ prefetchStatusLabel }}
          </span>
        </div>

        <div class="api-prefetch-stats">
          <div class="api-prefetch-stat">
            <span>进度</span>
            <strong>{{ prefetchProgressText }}</strong>
          </div>
          <div class="api-prefetch-stat">
            <span>当前单词</span>
            <strong class="api-prefetch-word">{{ prefetchCurrentWord || '—' }}</strong>
          </div>
        </div>

        <div class="api-prefetch-actions">
          <button
            class="api-fetch-button"
            type="button"
            :disabled="prefetchIsRunning"
            @click="startPrefetch"
          >
            <Play :size="13" />
            <span>开始补生成</span>
          </button>
          <button
            class="api-fetch-button api-prefetch-stop"
            type="button"
            :disabled="!prefetchIsRunning"
            @click="stopPrefetch"
          >
            <Square :size="13" />
            <span>停止</span>
          </button>
        </div>

        <div class="api-prefetch-logs">
          <span class="api-section__label">最近日志</span>
          <ul v-if="prefetchLogs.length" class="api-prefetch-log-list">
            <li
              v-for="log in prefetchLogs"
              :key="log.id"
              class="api-prefetch-log"
              :class="`is-${log.level}`"
            >
              <time>{{ formatPrefetchTime(log.at) }}</time>
              <span v-if="log.word" class="api-prefetch-log__word">{{ log.word }}</span>
              <span class="api-prefetch-log__msg">{{ log.message }}</span>
            </li>
          </ul>
          <p v-else class="api-feedback" style="opacity: 0.75; margin: 0">
            <span>暂无日志；App 启动或导入单词后会在此显示</span>
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

      <section class="api-card api-prefetch-console">
        <div class="api-card__heading">
          <div class="api-card__heading-mark"><Zap :size="16" /></div>
          <div>
            <h2>AI 后台控制台</h2>
            <p>查看例句静默预生成进度（不弹 toast）</p>
          </div>
          <span
            class="api-prefetch-status-badge"
            :class="{ 'is-running': prefetchIsRunning }"
          >{{ prefetchStatusLabel }}</span>
        </div>

        <div class="api-prefetch-stats">
          <div class="api-prefetch-stat">
            <span class="api-prefetch-stat__label">进度</span>
            <strong class="api-prefetch-stat__value">{{ prefetchProgressText }}</strong>
          </div>
          <div class="api-prefetch-stat">
            <span class="api-prefetch-stat__label">当前单词</span>
            <strong class="api-prefetch-stat__value api-prefetch-stat__value--word">
              {{ prefetchCurrentWord || '—' }}
            </strong>
          </div>
        </div>

        <div class="api-prefetch-actions">
          <button
            class="api-prefetch-btn"
            type="button"
            :disabled="prefetchIsRunning"
            @click="startPrefetch"
          >
            <Play :size="14" />
            <span>开始补生成</span>
          </button>
          <button
            class="api-prefetch-btn api-prefetch-btn--stop"
            type="button"
            :disabled="!prefetchIsRunning"
            @click="stopPrefetch"
          >
            <Square :size="14" />
            <span>停止</span>
          </button>
        </div>

        <div class="api-prefetch-logs">
          <div class="api-prefetch-logs__header">
            <span>最近日志</span>
            <span v-if="prefetchLogs.length">{{ prefetchLogs.length }} 条</span>
          </div>
          <ul v-if="prefetchLogs.length" class="api-prefetch-log-list">
            <li
              v-for="log in prefetchLogs"
              :key="log.id"
              class="api-prefetch-log"
              :class="`is-${log.level}`"
            >
              <span class="api-prefetch-log__time">{{ formatPrefetchTime(log.at) }}</span>
              <span v-if="log.word" class="api-prefetch-log__word">{{ log.word }}</span>
              <span class="api-prefetch-log__msg">{{ log.message }}</span>
            </li>
          </ul>
          <p v-else class="api-prefetch-logs__empty">暂无日志；启动或导入单词后会在此显示</p>
        </div>
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
