import CryptoJS from 'crypto-js'
import type { ApiConfig, DictionaryApiConfig } from '@/db/schema/database'
import { getEnabledDictionaryApiConfigs } from '@/db/repositories/dictionary-api-config.repository'
import { getApiConfig } from '@/db/repositories/api-config.repository'
import {
  ensureLocalDictionary,
  lookupLocalDictionary,
} from '@/services/local-dictionary.service'

export interface WordDefinition {
  word: string
  phonetic?: string
  pos?: string
  translation?: string
  source: string
}

function isUsableDictionaryConfig(config: DictionaryApiConfig): boolean {
  if (!config.enabled) return false
  if (!config.apiKey?.trim()) return false
  if (config.provider === 'custom' && !config.endpoint?.trim()) return false
  // 百度 / 有道需要 secret
  if ((config.provider === 'youdao' || config.provider === 'baidu') && !config.apiSecret?.trim()) {
    return false
  }
  return true
}

async function getUsableDictionaryConfigs(): Promise<DictionaryApiConfig[]> {
  const configs = await getEnabledDictionaryApiConfigs()
  return configs.filter(isUsableDictionaryConfig)
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '')
}

async function getReadyLlmConfig(): Promise<ApiConfig | null> {
  const apiConfig = await getApiConfig()
  if (!apiConfig) return null
  if (!apiConfig.baseUrl?.trim() || !apiConfig.apiKey?.trim() || !apiConfig.textModel?.trim()) {
    console.warn('[Dictionary] LLM API config incomplete')
    return null
  }
  return apiConfig
}

// 有道词典 API
async function queryYoudaoDict(word: string, config: DictionaryApiConfig): Promise<WordDefinition | null> {
  try {
    const salt = Date.now().toString()
    const curtime = Math.round(Date.now() / 1000).toString()
    const signStr = config.apiKey + truncate(word) + salt + curtime + config.apiSecret
    const sign = CryptoJS.SHA256(signStr).toString(CryptoJS.enc.Hex)

    const params = new URLSearchParams({
      q: word,
      from: 'en',
      to: 'zh-CHS',
      appKey: config.apiKey,
      salt,
      sign,
      signType: 'v3',
      curtime,
    })

    const url = config.endpoint || 'https://openapi.youdao.com/api'
    const response = await fetch(`${url}?${params.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })

    if (!response.ok) {
      console.error(`Youdao API HTTP error: ${response.status}`)
      return null
    }

    const data = await response.json()

    if (data.errorCode !== '0') {
      console.error(`Youdao API error: ${data.errorCode}`)
      return null
    }

    const translation = data.translation?.[0] || data.basic?.explains?.[0] || ''
    const phonetic = data.basic?.phonetic || data.basic?.['us-phonetic'] || data.basic?.['uk-phonetic']

    if (!translation) {
      console.warn('Youdao API returned empty translation')
      return null
    }

    return {
      word,
      phonetic: phonetic ? `/${phonetic}/` : undefined,
      translation,
      source: 'youdao',
    }
  } catch (error) {
    console.error('Youdao API request failed:', error)
    return null
  }
}

function truncate(q: string): string {
  const len = q.length
  if (len <= 20) return q
  return q.substring(0, 10) + len + q.substring(len - 10, len)
}

async function queryIcibaDict(word: string, config: DictionaryApiConfig): Promise<WordDefinition | null> {
  try {
    const url = config.endpoint || 'http://dict-co.iciba.com/api/dictionary.php'
    const response = await fetch(`${url}?w=${encodeURIComponent(word)}&key=${config.apiKey}`)

    if (!response.ok) {
      console.error(`Iciba API HTTP error: ${response.status}`)
      return null
    }

    const text = await response.text()
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(text, 'text/xml')

    const ps = xmlDoc.getElementsByTagName('ps')[0]?.textContent
    const acceptation = xmlDoc.getElementsByTagName('acceptation')[0]?.textContent

    if (!acceptation) {
      console.warn('Iciba API returned empty translation')
      return null
    }

    return {
      word,
      phonetic: ps ? `/${ps}/` : undefined,
      translation: acceptation,
      source: 'iciba',
    }
  } catch (error) {
    console.error('Iciba API request failed:', error)
    return null
  }
}

async function queryBaiduDict(word: string, config: DictionaryApiConfig): Promise<WordDefinition | null> {
  try {
    const salt = Date.now().toString()
    const signStr = config.apiKey + word + salt + config.apiSecret
    const sign = CryptoJS.MD5(signStr).toString()

    const params = new URLSearchParams({
      q: word,
      from: 'en',
      to: 'zh',
      appid: config.apiKey,
      salt,
      sign,
    })

    const url = config.endpoint || 'https://fanyi-api.baidu.com/api/trans/vip/translate'
    const response = await fetch(`${url}?${params.toString()}`)

    if (!response.ok) {
      console.error(`Baidu API HTTP error: ${response.status}`)
      return null
    }

    const data = await response.json()

    if (data.error_code) {
      console.error(`Baidu API error: ${data.error_code}`)
      return null
    }

    const translation = data.trans_result?.[0]?.dst

    if (!translation) {
      console.warn('Baidu API returned empty translation')
      return null
    }

    return {
      word,
      translation,
      source: 'baidu',
    }
  } catch (error) {
    console.error('Baidu API request failed:', error)
    return null
  }
}

async function queryCustomDict(word: string, config: DictionaryApiConfig): Promise<WordDefinition | null> {
  try {
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({ word }),
    })

    if (!response.ok) {
      console.error(`Custom API HTTP error: ${response.status}`)
      return null
    }

    const data = await response.json()

    return {
      word,
      phonetic: data.phonetic,
      pos: data.pos,
      translation: data.translation,
      source: 'custom',
    }
  } catch (error) {
    console.error('Custom API request failed:', error)
    return null
  }
}

async function queryDictionaryProvider(
  word: string,
  config: DictionaryApiConfig,
): Promise<WordDefinition | null> {
  switch (config.provider) {
    case 'youdao':
      return queryYoudaoDict(word, config)
    case 'iciba':
      return queryIcibaDict(word, config)
    case 'baidu':
      return queryBaiduDict(word, config)
    case 'custom':
      return queryCustomDict(word, config)
    default:
      return null
  }
}

/** 用用户配置的文本模型补一条释义 */
async function queryFallbackLLM(word: string): Promise<WordDefinition | null> {
  try {
    const apiConfig = await getReadyLlmConfig()
    if (!apiConfig) {
      console.error('[Dictionary] No ready LLM API config')
      return null
    }

    const prompt = `请为英语单词 "${word}" 提供简洁的中文释义。只需返回释义文本，不要其他说明。格式示例："n. 苹果；v. 应用"`

    const response = await fetch(`${normalizeBaseUrl(apiConfig.baseUrl)}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: apiConfig.textModel,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 100,
      }),
    })

    if (!response.ok) {
      console.error(`LLM API HTTP error: ${response.status}`)
      return null
    }

    const data = await response.json()
    const translation = data.choices?.[0]?.message?.content?.trim()

    if (!translation) {
      console.warn('LLM API returned empty translation')
      return null
    }

    return {
      word,
      translation,
      source: 'llm-fallback',
    }
  } catch (error) {
    console.error('LLM fallback API request failed:', error)
    return null
  }
}

/**
 * 批量用 LLM 补释义（导入未命中时更高效）
 */
async function queryFallbackLLMBatch(words: string[]): Promise<Map<string, WordDefinition>> {
  const results = new Map<string, WordDefinition>()
  if (words.length === 0) return results

  const apiConfig = await getReadyLlmConfig()
  if (!apiConfig) {
    console.error('[Dictionary] No ready LLM API config for batch fill')
    return results
  }

  // 一次请求太多易失败，按批切分
  const CHUNK = 20
  for (let start = 0; start < words.length; start += CHUNK) {
    const chunk = words.slice(start, start + CHUNK)
    try {
      const prompt = `请为下列英语单词提供简洁中文释义。只返回 JSON 对象，键为单词，值为释义字符串。不要 markdown。
格式示例：{"apple":"n. 苹果","apply":"v. 申请；应用"}

单词列表：
${chunk.map((w, i) => `${i + 1}. ${w}`).join('\n')}`

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
          max_tokens: Math.min(1200, 80 * chunk.length),
        }),
      })

      if (!response.ok) {
        console.error(`LLM batch HTTP error: ${response.status}`)
        // 降级为逐词
        for (const word of chunk) {
          const one = await queryFallbackLLM(word)
          if (one) results.set(word, one)
        }
        continue
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content?.trim() || ''
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        console.warn('[Dictionary] LLM batch returned non-JSON, falling back per word')
        for (const word of chunk) {
          const one = await queryFallbackLLM(word)
          if (one) results.set(word, one)
        }
        continue
      }

      const parsed = JSON.parse(jsonMatch[0]) as Record<string, string>
      for (const word of chunk) {
        const translation = parsed[word]?.trim() || parsed[word.toLowerCase()]?.trim()
        if (translation) {
          results.set(word, { word, translation, source: 'llm-fallback' })
        } else {
          const one = await queryFallbackLLM(word)
          if (one) results.set(word, one)
        }
      }
    } catch (error) {
      console.error('[Dictionary] LLM batch failed:', error)
      for (const word of chunk) {
        const one = await queryFallbackLLM(word)
        if (one) results.set(word, one)
      }
    }
  }

  return results
}

/** 仅远程补全：有可用词典 API 则按优先级试，否则直接走用户 LLM */
export async function queryRemoteDefinition(word: string): Promise<WordDefinition | null> {
  const configs = await getUsableDictionaryConfigs()

  if (configs.length === 0) {
    console.log('[Dictionary] No usable dictionary API, using LLM directly')
    return queryFallbackLLM(word)
  }

  for (const config of configs) {
    console.log(`[Dictionary] Trying ${config.name} (priority: ${config.priority})`)
    const result = await queryDictionaryProvider(word, config)
    if (result?.translation) {
      console.log(`[Dictionary] Success with ${config.name}`)
      return result
    }
    console.warn(`[Dictionary] ${config.name} failed, trying next...`)
  }

  console.log('[Dictionary] Dictionary APIs failed, using LLM fallback')
  return queryFallbackLLM(word)
}

/** 本地 ECDICT 优先，未命中再远程（词典 API → LLM） */
export async function queryWordDefinition(word: string): Promise<WordDefinition | null> {
  console.log(`[Dictionary] Querying definition for word: ${word}`)

  try {
    await ensureLocalDictionary()
    const local = await lookupLocalDictionary(word)
    if (local?.translation) {
      return {
        word: local.word,
        phonetic: local.phonetic || undefined,
        pos: local.pos || undefined,
        translation: local.translation,
        source: 'local-ecdict',
      }
    }
  } catch (error) {
    console.warn('[Dictionary] Local dict lookup failed:', error)
  }

  return queryRemoteDefinition(word)
}

/**
 * 导入专用：先本地匹配，收集未命中后再补全
 * - 有可用词典 API：逐词试词典，失败再用 LLM
 * - 无词典 API：未命中整批直接走用户配置的 LLM
 */
export async function resolveDefinitionsForImport(
  words: string[],
  onProgress?: (phase: 'local' | 'remote', done: number, total: number, hint?: string) => void,
): Promise<{
  definitions: Map<string, WordDefinition>
  matchedLocal: number
  filledRemote: number
  missed: number
}> {
  const unique = [...new Set(words.map((w) => w.trim().toLowerCase()).filter(Boolean))]
  const definitions = new Map<string, WordDefinition>()
  const missing: string[] = []

  await ensureLocalDictionary()

  for (let i = 0; i < unique.length; i++) {
    const word = unique[i]
    onProgress?.('local', i + 1, unique.length, word)
    const local = await lookupLocalDictionary(word)
    if (local?.translation?.trim()) {
      definitions.set(word, {
        word: local.word,
        phonetic: local.phonetic || undefined,
        pos: local.pos || undefined,
        translation: local.translation,
        source: 'local-ecdict',
      })
    } else {
      missing.push(word)
    }
  }

  const matchedLocal = definitions.size

  if (missing.length === 0) {
    return { definitions, matchedLocal, filledRemote: 0, missed: 0 }
  }

  const configs = await getUsableDictionaryConfigs()
  let filledRemote = 0

  if (configs.length === 0) {
    console.log(`[Dictionary] ${missing.length} unmatched, filling via LLM API`)
    onProgress?.('remote', 0, missing.length, 'AI 批量补全中...')
    const llmMap = await queryFallbackLLMBatch(missing)
    for (const [word, def] of llmMap) {
      definitions.set(word, def)
      filledRemote += 1
    }
    onProgress?.('remote', missing.length, missing.length)
  } else {
    console.log(`[Dictionary] ${missing.length} unmatched, trying dictionary APIs then LLM`)
    const stillMissing: string[] = []

    for (let i = 0; i < missing.length; i++) {
      const word = missing[i]
      onProgress?.('remote', i + 1, missing.length, word)
      let hit: WordDefinition | null = null
      for (const config of configs) {
        hit = await queryDictionaryProvider(word, config)
        if (hit?.translation) break
      }
      if (hit?.translation) {
        definitions.set(word, hit)
        filledRemote += 1
      } else {
        stillMissing.push(word)
      }
    }

    if (stillMissing.length > 0) {
      onProgress?.('remote', missing.length, missing.length, 'AI 补全剩余单词...')
      const llmMap = await queryFallbackLLMBatch(stillMissing)
      for (const [word, def] of llmMap) {
        definitions.set(word, def)
        filledRemote += 1
      }
    }
  }

  const missed = unique.length - definitions.size
  return { definitions, matchedLocal, filledRemote, missed }
}

export async function queryWordDefinitions(words: string[]): Promise<Map<string, WordDefinition>> {
  const { definitions } = await resolveDefinitionsForImport(words)
  return definitions
}
