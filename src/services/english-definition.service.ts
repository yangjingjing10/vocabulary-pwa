/**
 * 英文释义：优先 Free Dictionary API；国内常超时则回退到用户配置的 LLM。
 * 长期可改为 ECDICT 离线英文 definition 字段，完全不依赖外网。
 */

import type { ApiConfig } from '@/db/schema/database'
import { getApiConfig } from '@/db/repositories/api-config.repository'
import { extractChatCompletionText } from '@/services/llm-response.util'

export interface EnglishSense {
  partOfSpeech: string
  definitions: string[]
}

export interface EnglishDefinitionResult {
  word: string
  phonetic?: string
  senses: EnglishSense[]
  source: 'free-dictionary' | 'llm'
}

const cache = new Map<string, EnglishDefinitionResult | null>()
const FREE_DICT_TIMEOUT_MS = 6000

function normalizeWord(word: string): string {
  return word.trim().toLowerCase()
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '')
}

async function getReadyLlmConfig(): Promise<ApiConfig | null> {
  const apiConfig = await getApiConfig()
  if (!apiConfig) return null
  if (!apiConfig.baseUrl?.trim() || !apiConfig.apiKey?.trim() || !apiConfig.textModel?.trim()) {
    return null
  }
  return apiConfig
}

async function fetchFromFreeDictionary(
  key: string,
): Promise<EnglishDefinitionResult | null> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), FREE_DICT_TIMEOUT_MS)

  try {
    const response = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(key)}`,
      { signal: controller.signal },
    )

    if (!response.ok) return null

    const data = (await response.json()) as Array<{
      word?: string
      phonetic?: string
      phonetics?: Array<{ text?: string }>
      meanings?: Array<{
        partOfSpeech?: string
        definitions?: Array<{ definition?: string }>
      }>
    }>

    const entry = data?.[0]
    if (!entry?.meanings?.length) return null

    const senses: EnglishSense[] = []
    for (const meaning of entry.meanings) {
      const defs = (meaning.definitions || [])
        .map((d) => (d.definition || '').trim())
        .filter(Boolean)
      if (!defs.length) continue
      senses.push({
        partOfSpeech: (meaning.partOfSpeech || '').trim() || '—',
        definitions: defs,
      })
    }

    if (!senses.length) return null

    return {
      word: entry.word || key,
      phonetic: entry.phonetic || entry.phonetics?.find((p) => p.text)?.text,
      senses,
      source: 'free-dictionary',
    }
  } catch (error) {
    console.warn('[EnglishDef] Free Dictionary unreachable (often blocked in CN):', error)
    return null
  } finally {
    window.clearTimeout(timer)
  }
}

function parseLlmSenses(content: string, word: string): EnglishSense[] {
  const jsonMatch = content.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return []

  try {
    const parsed = JSON.parse(jsonMatch[0]) as unknown
    if (!Array.isArray(parsed)) return []

    const senses: EnglishSense[] = []
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue
      const pos = String((item as { pos?: string; partOfSpeech?: string }).pos
        || (item as { partOfSpeech?: string }).partOfSpeech
        || '').trim() || '—'
      const rawDefs = (item as { definitions?: unknown }).definitions
      const defs = Array.isArray(rawDefs)
        ? rawDefs.map((d) => String(d || '').trim()).filter(Boolean)
        : []
      if (!defs.length) continue
      senses.push({ partOfSpeech: pos, definitions: defs.slice(0, 8) })
    }

    // 至少给一个兜底：若模型只回了纯文本数组
    if (!senses.length && parsed.every((x) => typeof x === 'string')) {
      const defs = (parsed as string[]).map((d) => d.trim()).filter(Boolean)
      if (defs.length) {
        senses.push({ partOfSpeech: '—', definitions: defs.slice(0, 8) })
      }
    }

    void word
    return senses
  } catch {
    return []
  }
}

async function fetchFromLlm(key: string): Promise<EnglishDefinitionResult | null> {
  const apiConfig = await getReadyLlmConfig()
  if (!apiConfig) {
    console.warn('[EnglishDef] No LLM config for English gloss fallback')
    return null
  }

  try {
    const prompt = `Provide English dictionary definitions for the word "${key}".
Return ONLY a JSON array. No markdown. Each item:
{"pos":"noun|verb|adjective|...","definitions":["gloss 1","gloss 2"]}
Rules:
- Definitions MUST be in English only (learner-friendly, concise).
- Cover main senses; up to 6 glosses per part of speech.
- Do not include Chinese.`

    const response = await fetch(`${normalizeBaseUrl(apiConfig.baseUrl)}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: apiConfig.textModel,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 800,
      }),
    })

    if (!response.ok) {
      console.error(`[EnglishDef] LLM HTTP ${response.status}`)
      return null
    }

    const data = await response.json()
    const { text: content } = extractChatCompletionText(data)
    const senses = parseLlmSenses(content, key)
    if (!senses.length) return null

    return {
      word: key,
      senses,
      source: 'llm',
    }
  } catch (error) {
    console.warn('[EnglishDef] LLM fallback failed:', error)
    return null
  }
}

/**
 * 拉取某词全部英文义项（按词性分组）。
 * Free Dictionary（外网）→ 用户 LLM；都失败返回 null。
 */
export async function fetchEnglishDefinitions(
  word: string,
): Promise<EnglishDefinitionResult | null> {
  const key = normalizeWord(word)
  if (!key) return null

  if (cache.has(key)) {
    return cache.get(key) ?? null
  }

  const fromApi = await fetchFromFreeDictionary(key)
  if (fromApi) {
    cache.set(key, fromApi)
    return fromApi
  }

  const fromLlm = await fetchFromLlm(key)
  cache.set(key, fromLlm)
  return fromLlm
}

export function englishDefinitionSourceLabel(
  source: EnglishDefinitionResult['source'] | undefined,
): string {
  if (source === 'llm') return '英文释义由 AI 生成（外网词典不可达）'
  if (source === 'free-dictionary') return '英文释义来自 Free Dictionary / Wiktionary'
  return '英文释义'
}
