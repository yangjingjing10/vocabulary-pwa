import { getApiConfig } from '@/db/repositories/api-config.repository'
import {
  getUserExamplesForWord,
  putLocalExamplesForWord,
} from '@/db/repositories/local-dict.repository'
import type { LocalExampleItem } from '@/db/schema/database'
import { extractChatCompletionText } from '@/services/llm-response.util'

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '')
}

function isOllamaEndpoint(baseUrl: string): boolean {
  return /:11434\b/i.test(baseUrl) || /ollama/i.test(baseUrl)
}

const SYSTEM_PROMPT = `你是英语教学例句作者，专门写「能帮助学习者从语境推出词义」的例句。

硬性要求：
1. 为目标词生成恰好 3 条英文例句，每条附一句简洁中文翻译。
2. 目标词必须是句义核心（作谓语、表语或关键名词），禁止只在句中顺带出现。
3. 读完英文后，即使不认识该词，也应能根据情境较有把握地猜出其大致意思。
4. 语境具体、信息充足：写清谁在什么情况下做了什么、产生了什么结果或感受；避免空洞套话。
5. 句子自然、难度适中（CEFR B1–B2），长度约 10–20 个单词；不要百科定义堆砌，不要生造怪句。
6. 三条例句覆盖略有不同的情境或搭配，但词义一致、不偏僻义。
7. 中文翻译准确对应英文，不要解释词义本身。
8. 只返回 JSON，不要 markdown，不要其他说明。格式：
{"examples":[{"sentence":"...","translation":"..."},{"sentence":"...","translation":"..."},{"sentence":"...","translation":"..."}]}`

/** 小模型更容易遵守的短指令（JSON 解析失败后重试用） */
const SIMPLE_JSON_RETRY_PROMPT = `只输出一个 JSON 对象，不要 markdown，不要解释。
格式必须是：
{"examples":[{"sentence":"英文句1","translation":"中文1"},{"sentence":"英文句2","translation":"中文2"},{"sentence":"英文句3","translation":"中文3"}]}
为下面单词写 3 条能让人猜出词义的英文例句（B1，每句约 10-18 词）。`

function buildUserPrompt(word: string, gloss?: string): string {
  const glossLine = gloss?.trim()
    ? `参考中文释义（仅供你把握词义，不要照抄进例句）：${gloss.trim()}`
    : '未提供参考释义，请按该词最常用义出题。'
  return `目标单词：${word.trim()}\n${glossLine}`
}

/** 尽量把模型乱七八糟的输出修成可 parse 的 JSON 字符串 */
function sanitizeJsonCandidate(text: string): string {
  let s = text.trim()
  // 去掉 markdown 围栏（含中间夹杂）
  s = s.replace(/^```(?:json|JSON)?\s*/i, '').replace(/\s*```$/i, '')
  s = s.replace(/```(?:json|JSON)?\s*/gi, '').replace(/```/g, '')

  // 智能引号 → 普通引号
  s = s.replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')
  s = s.replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")

  const start = s.indexOf('{')
  const end = s.lastIndexOf('}')
  if (start >= 0 && end > start) {
    s = s.slice(start, end + 1)
  }

  // 去掉尾逗号：{"a":1,} / [1,2,]
  s = s.replace(/,\s*([}\]])/g, '$1')
  return s.trim()
}

function extractJsonObject(text: string): unknown {
  const candidate = sanitizeJsonCandidate(text)
  if (!candidate) throw new Error('模型未返回合法 JSON')

  try {
    return JSON.parse(candidate)
  } catch {
    // 偶发单引号 key/value，尝试轻量替换后再 parse（仅当几乎全是单引号风格时）
    const softened = candidate
      .replace(/([{,]\s*)'([^']+)'(\s*:)/g, '$1"$2"$3')
      .replace(/:\s*'([^']*)'/g, ': "$1"')
    try {
      return JSON.parse(softened)
    } catch {
      throw new Error('模型未返回合法 JSON')
    }
  }
}

function parseExamples(payload: unknown): LocalExampleItem[] {
  if (!payload || typeof payload !== 'object') return []
  const obj = payload as Record<string, unknown>
  const raw = obj.examples ?? obj.data ?? obj.items ?? obj.sentences
  if (!Array.isArray(raw)) return []

  const out: LocalExampleItem[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const r = row as Record<string, unknown>
    const sentence = String(
      r.sentence ?? r.en ?? r.english ?? r.text ?? r.example ?? '',
    ).trim()
    const translation = String(
      r.translation ?? r.zh ?? r.chinese ?? r.cn ?? r.meaning ?? '',
    ).trim()
    if (!sentence) continue
    out.push({ sentence, translation })
  }
  return out
}

/**
 * 小模型常返回编号列表而非 JSON，尽量抢救：
 * 1. She abandoned the plan. 她放弃了计划。
 * 1) English. 中文
 * - English / 中文
 */
function parseExamplesFromPlainText(text: string): LocalExampleItem[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  const out: LocalExampleItem[] = []
  for (const line of lines) {
    const cleaned = line
      .replace(/^[-*•]\s*/, '')
      .replace(/^\d+[\).、:：]\s*/, '')
      .trim()
    if (!cleaned || cleaned.startsWith('{') || cleaned.startsWith('```')) continue

    // English. 中文 / English — 中文 / English / 中文
    const m =
      cleaned.match(/^(.+?[.!?])\s*[/|｜]\s*(.+)$/) ||
      cleaned.match(/^(.+?[.!?])\s*[—–\-]\s*(.+)$/) ||
      cleaned.match(/^(.+?[.!?])\s+([\u4e00-\u9fff].+)$/)

    if (m) {
      const sentence = m[1]!.trim()
      const translation = m[2]!.trim()
      if (/[a-zA-Z]/.test(sentence)) {
        out.push({ sentence, translation })
      }
    } else if (/^[A-Za-z]/.test(cleaned) && /[.!?]$/.test(cleaned) && cleaned.split(/\s+/).length >= 5) {
      out.push({ sentence: cleaned, translation: '' })
    }

    if (out.length >= 3) break
  }
  return out
}

function tryParseGeneratedExamples(text: string): LocalExampleItem[] {
  try {
    const fromJson = parseExamples(extractJsonObject(text))
    if (fromJson.length > 0) return fromJson
  } catch {
    // fall through
  }
  return parseExamplesFromPlainText(text)
}

function mergeExamples(
  existing: LocalExampleItem[],
  generated: LocalExampleItem[],
): LocalExampleItem[] {
  const seen = new Set<string>()
  const merged: LocalExampleItem[] = []
  for (const item of [...generated, ...existing]) {
    const key = item.sentence.toLowerCase().trim()
    if (!key || seen.has(key)) continue
    seen.add(key)
    merged.push({
      sentence: item.sentence.trim(),
      translation: (item.translation || '').trim(),
    })
    if (merged.length >= 8) break
  }
  return merged
}

async function requestExamples(
  baseUrl: string,
  apiKey: string,
  model: string,
  word: string,
  gloss: string | undefined,
  opts: {
    maxTokens: number
    mergeSystemIntoUser: boolean
    simpleRetry?: boolean
    forceJsonFormat?: boolean
  },
): Promise<{ text: string; finishReason?: string; hadReasoningOnly: boolean; raw: unknown }> {
  const system = opts.simpleRetry ? SIMPLE_JSON_RETRY_PROMPT : SYSTEM_PROMPT
  const user = opts.simpleRetry
    ? `目标单词：${word.trim()}${gloss?.trim() ? `\n参考中文释义：${gloss.trim()}` : ''}`
    : buildUserPrompt(word, gloss)
  const messages = opts.mergeSystemIntoUser
    ? [{ role: 'user', content: `${system}\n\n---\n\n${user}` }]
    : [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ]

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: opts.simpleRetry ? 0.3 : 0.55,
    max_tokens: opts.maxTokens,
  }

  // Ollama：强制 JSON 模式，小模型更不容易跑偏；forceJsonFormat=false 可关闭（兼容不支持该字段的后端）
  const useJsonFormat = opts.forceJsonFormat ?? isOllamaEndpoint(baseUrl)
  if (useJsonFormat) {
    body.format = 'json'
    body.response_format = { type: 'json_object' }
  }

  const response = await fetch(`${normalizeBaseUrl(baseUrl)}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  const rawText = await response.text()
  let data: unknown
  try {
    data = JSON.parse(rawText)
  } catch {
    throw new Error(`AI 返回无法解析（HTTP ${response.status}）`)
  }

  if (!response.ok) {
    // 部分后端不认 format / response_format，去掉后再由上层重试
    const errMsg =
      (data as { error?: { message?: string } })?.error?.message ||
      `AI 请求失败（HTTP ${response.status}）`
    throw new Error(errMsg)
  }

  const extracted = extractChatCompletionText(data)
  return {
    text: extracted.text,
    finishReason: extracted.finishReason,
    hadReasoningOnly: extracted.hadReasoningOnly,
    raw: data,
  }
}

export interface GenerateExamplesOptions {
  /** 强制重新生成并覆盖用户例句库（用于质量差时重写） */
  force?: boolean
}

/**
 * 用用户配置的 LLM 为目标词生成高质量可推义例句，并写入用户例句库（可备份、重建词包不丢）
 */
export async function generateQualityExamplesForWord(
  word: string,
  gloss?: string,
  opts: GenerateExamplesOptions = {},
): Promise<LocalExampleItem[]> {
  const key = word.trim().toLowerCase()
  if (!key) throw new Error('单词为空')

  const force = Boolean(opts.force)
  const previousUser = await getUserExamplesForWord(key)

  // 非强制且已有足够用户/AI 例句则直接复用，避免重复消耗 token
  if (!force) {
    const previousWithTranslation = previousUser.filter((e) => e.translation?.trim())
    if (previousWithTranslation.length >= 2) {
      return previousWithTranslation.slice(0, 3)
    }
  }

  const apiConfig = await getApiConfig()
  if (
    !apiConfig?.baseUrl?.trim() ||
    !apiConfig.apiKey?.trim() ||
    !apiConfig.textModel?.trim()
  ) {
    throw new Error('请先在设置中配置 API（地址 / 密钥 / 文本模型）')
  }

  const { baseUrl, apiKey, textModel } = apiConfig
  const ollama = isOllamaEndpoint(baseUrl)

  async function callOnce(params: {
    maxTokens: number
    mergeSystemIntoUser: boolean
    simpleRetry?: boolean
    forceJsonFormat?: boolean
  }) {
    try {
      return await requestExamples(baseUrl, apiKey, textModel, word, gloss, params)
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      // 个别代理/旧版不支持 format 字段：关掉 JSON 强制再试一次
      if (params.forceJsonFormat !== false && /format|response_format|unknown|400/i.test(msg)) {
        return requestExamples(baseUrl, apiKey, textModel, word, gloss, {
          ...params,
          forceJsonFormat: false,
        })
      }
      throw err
    }
  }

  // 推理模型常把额度花在 thinking 上；本地小模型也给足一点输出空间
  let result = await callOnce({
    maxTokens: ollama ? 1200 : 1800,
    mergeSystemIntoUser: false,
    forceJsonFormat: ollama,
  })

  if (!result.text.trim()) {
    console.warn('[ExampleGen] 首次 content 为空，提高额度并合并 system 后重试', {
      finishReason: result.finishReason,
      hadReasoningOnly: result.hadReasoningOnly,
    })
    result = await callOnce({
      maxTokens: ollama ? 1600 : 3200,
      mergeSystemIntoUser: true,
      forceJsonFormat: ollama,
    })
  }

  if (!result.text.trim()) {
    if (result.finishReason === 'length') {
      throw new Error('AI 输出被截断（多为推理模型占满 token），请换非推理模型或提高上限后重试')
    }
    throw new Error('AI 返回为空（若使用 deepseek-r1 等推理模型，请改用普通聊天模型）')
  }

  let generated = tryParseGeneratedExamples(result.text)

  // 小模型第一次常夹杂说明文字：用更短指令再要一次纯 JSON
  if (generated.length === 0) {
    console.warn('[ExampleGen] 首次解析失败，简化提示后重试，原文片段:', result.text.slice(0, 240))
    result = await callOnce({
      maxTokens: ollama ? 1000 : 1600,
      mergeSystemIntoUser: true,
      simpleRetry: true,
      forceJsonFormat: ollama,
    })
    generated = tryParseGeneratedExamples(result.text)
  }

  if (generated.length === 0) {
    console.warn('[ExampleGen] 仍无法解析，原文片段:', result.text.slice(0, 240))
    throw new Error('模型未返回合法 JSON（小模型易跑偏，可换 qwen2.5:3b 或重试）')
  }

  // 强制重生成：用新例句覆盖，避免旧低质句继续占位
  const merged = force ? generated.slice(0, 8) : mergeExamples(previousUser, generated)
  await putLocalExamplesForWord(key, merged)

  return generated
}
