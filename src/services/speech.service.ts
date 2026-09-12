import { ref } from 'vue'

const STORAGE_VOICE = 'vocab-speech-voice-uri'
const STORAGE_RATE = 'vocab-speech-rate'

export interface SpeechVoiceOption {
  voiceURI: string
  name: string
  lang: string
  localService: boolean
  /** 展示用：如 Google US English / Microsoft Aria */
  label: string
}

const selectedVoiceURI = ref(loadVoiceURI())
const speechRate = ref(loadRate())
const availableVoices = ref<SpeechVoiceOption[]>([])

let voicesReady: Promise<SpeechVoiceOption[]> | null = null

function loadVoiceURI(): string {
  try {
    return localStorage.getItem(STORAGE_VOICE) || ''
  } catch {
    return ''
  }
}

function loadRate(): number {
  try {
    const raw = localStorage.getItem(STORAGE_RATE)
    const n = raw ? Number(raw) : 0.95
    if (Number.isFinite(n) && n >= 0.6 && n <= 1.2) return n
  } catch {
    // ignore
  }
  return 0.95
}

function toOption(voice: SpeechSynthesisVoice): SpeechVoiceOption {
  return {
    voiceURI: voice.voiceURI,
    name: voice.name,
    lang: voice.lang,
    localService: voice.localService,
    label: `${voice.name} (${voice.lang})${voice.localService ? '' : ' · 在线'}`,
  }
}

function isEnglish(voice: SpeechSynthesisVoice | SpeechVoiceOption): boolean {
  return /^en([-_]|$)/i.test(voice.lang)
}

/** 常见「听感更自然」的英文音色优先排前面 */
function voiceScore(v: SpeechVoiceOption): number {
  const name = v.name.toLowerCase()
  let score = 0
  if (/en-us/i.test(v.lang)) score += 40
  else if (/en-gb/i.test(v.lang)) score += 30
  else if (/en-au|en-ca|en-in/i.test(v.lang)) score += 20
  else if (isEnglish(v)) score += 10

  if (/aria|jenny|guy|sara|sonia|natasha|google us|microsoft.*natural|enhanced|neural/i.test(name)) {
    score += 25
  }
  if (/samantha|alex|daniel|karen|moira|tessa|victoria|zira|david/i.test(name)) {
    score += 15
  }
  if (v.localService) score += 5
  // 一些旧引擎偏机械 / 口音怪，略降权
  if (/espeak|compact|robot/i.test(name)) score -= 20
  return score
}

function readBrowserVoices(): SpeechVoiceOption[] {
  if (!('speechSynthesis' in window)) return []
  const list = window.speechSynthesis.getVoices().map(toOption)
  const english = list.filter(isEnglish)
  const pool = english.length > 0 ? english : list
  return pool.sort((a, b) => voiceScore(b) - voiceScore(a) || a.name.localeCompare(b.name))
}

/**
 * 浏览器音色列表（异步：部分环境需等 voiceschanged）
 */
export function loadSpeechVoices(): Promise<SpeechVoiceOption[]> {
  if (!('speechSynthesis' in window)) {
    availableVoices.value = []
    return Promise.resolve([])
  }

  if (voicesReady) return voicesReady

  voicesReady = new Promise((resolve) => {
    const apply = () => {
      const voices = readBrowserVoices()
      availableVoices.value = voices

      // 若已保存音色不在列表里，清空让其走自动优选
      if (selectedVoiceURI.value && !voices.some((v) => v.voiceURI === selectedVoiceURI.value)) {
        selectedVoiceURI.value = ''
        try {
          localStorage.removeItem(STORAGE_VOICE)
        } catch {
          // ignore
        }
      }

      resolve(voices)
    }

    const immediate = readBrowserVoices()
    if (immediate.length > 0) {
      apply()
      return
    }

    const onChange = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', onChange)
      apply()
    }
    window.speechSynthesis.addEventListener('voiceschanged', onChange)
    // 兜底：部分浏览器不触发事件
    window.setTimeout(apply, 600)
  })

  return voicesReady
}

export function getSelectedVoiceURI() {
  return selectedVoiceURI.value
}

export function setSpeechVoiceURI(voiceURI: string) {
  selectedVoiceURI.value = voiceURI
  try {
    if (voiceURI) localStorage.setItem(STORAGE_VOICE, voiceURI)
    else localStorage.removeItem(STORAGE_VOICE)
  } catch {
    // ignore
  }
}

export function getSpeechRate() {
  return speechRate.value
}

export function setSpeechRate(rate: number) {
  const clamped = Math.min(1.2, Math.max(0.6, rate))
  speechRate.value = clamped
  try {
    localStorage.setItem(STORAGE_RATE, String(clamped))
  } catch {
    // ignore
  }
}

function pickVoice(): SpeechSynthesisVoice | null {
  if (!('speechSynthesis' in window)) return null
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null

  if (selectedVoiceURI.value) {
    const exact = voices.find((v) => v.voiceURI === selectedVoiceURI.value)
    if (exact) return exact
  }

  const ranked = [...voices]
    .filter(isEnglish)
    .sort((a, b) => voiceScore(toOption(b)) - voiceScore(toOption(a)))

  return ranked[0] || voices.find((v) => /^en/i.test(v.lang)) || voices[0] || null
}

/**
 * 用当前偏好音色朗读英文单词/短语
 */
export function speakText(text: string, options?: { lang?: string }) {
  const trimmed = text.trim()
  if (!trimmed || !('speechSynthesis' in window)) return

  // 打断上一次，避免连点叠音
  window.speechSynthesis.cancel()

  const utterance = new SpeechSynthesisUtterance(trimmed)
  const voice = pickVoice()
  if (voice) {
    utterance.voice = voice
    utterance.lang = voice.lang || options?.lang || 'en-US'
  } else {
    utterance.lang = options?.lang || 'en-US'
  }

  // 略慢一点，减轻「阴阳顿挫」感
  utterance.rate = speechRate.value
  utterance.pitch = 1
  utterance.volume = 1

  window.speechSynthesis.speak(utterance)
}

export function stopSpeaking() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }
}

export const speechSettings = {
  selectedVoiceURI,
  speechRate,
  availableVoices,
}
