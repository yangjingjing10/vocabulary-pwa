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

function buildUserPrompt(word: string, gloss?: string): string {
  const glossLine = gloss?.trim()
    ? `参考中文释义（仅供你把握词义，不要照抄进例句）：${gloss.trim()}`
    : '未提供参考释义，请按该词最常用义出题。'
  return `目标单词：${word.trim()}\n${glossLine}`
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim()
  // 去掉常见 markdown 围栏
  const unfenced = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  try {
    return JSON.parse(unfenced)
  } catch {
    const start = unfenced.indexOf('{')
    const end = unfenced.lastIndexOf('}')
    if (start >= 0 && end > start) {
      return JSON.parse(unfenced.slice(start, end + 1))
    }
    throw new Error('模型未返回合法 JSON')
  }
}

function parseExamples(payload: unknown): LocalExampleItem[] {
  if (!payload || typeof payload !== 'object') return []
  const raw = (payload as { examples?: unknown }).examples
  if (!Array.isArray(raw)) return []

  const out: LocalExampleItem[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const sentence = String((row as { sentence?: unknown }).sentence || '').trim()
    const translation = String((row as { translation?: unknown }).translation || '').trim()
    // 测验场景主要用英文句；中译缺失时仍保留例句
    if (!sentence) continue
    out.push({ sentence, translation })
  }
  return out
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
  opts: { maxTokens: number; mergeSystemIntoUser: boolean },
): Promise<{ text: string; finishReason?: string; hadReasoningOnly: boolean; raw: unknown }> {
  const system = SYSTEM_PROMPT
  const user = buildUserPrompt(word, gloss)
  const messages = opts.mergeSystemIntoUser
    ? [{ role: 'user', content: `${system}\n\n---\n\n${user}` }]
    : [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ]

  const response = await fetch(`${normalizeBaseUrl(baseUrl)}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.55,
      max_tokens: opts.maxTokens,
    }),
  })

  const rawText = await response.text()
  let data: unknown
  try {
    data = JSON.parse(rawText)
  } catch {
    throw new Error(`AI 返回无法解析（HTTP ${response.status}）`)
  }

  if (!response.ok) {
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

/**
 * 用用户配置的 LLM 为目标词生成高质量可推义例句，并写入用户例句库（可备份、重建词包不丢）
 */
export async function generateQualityExamplesForWord(
  word: string,
  gloss?: string,
): Promise<LocalExampleItem[]> {
  const key = word.trim().toLowerCase()
  if (!key) throw new Error('单词为空')

  const apiConfig = await getApiConfig()
  if (
    !apiConfig?.baseUrl?.trim() ||
    !apiConfig.apiKey?.trim() ||
    !apiConfig.textModel?.trim()
  ) {
    throw new Error('请先在设置中配置 API（地址 / 密钥 / 文本模型）')
  }

  const { baseUrl, apiKey, textModel } = apiConfig

  // 推理模型常把额度花在 thinking 上，600 很容易 content 为空；给足额度并在失败时重试
  let result = await requestExamples(baseUrl, apiKey, textModel, word, gloss, {
    maxTokens: 1800,
    mergeSystemIntoUser: false,
  })

  if (!result.text.trim()) {
    console.warn('[ExampleGen] 首次 content 为空，提高额度并合并 system 后重试', {
      finishReason: result.finishReason,
      hadReasoningOnly: result.hadReasoningOnly,
    })
    result = await requestExamples(baseUrl, apiKey, textModel, word, gloss, {
      maxTokens: 3200,
      mergeSystemIntoUser: true,
    })
  }

  if (!result.text.trim()) {
    if (result.finishReason === 'length') {
      throw new Error('AI 输出被截断（多为推理模型占满 token），请换非推理模型或提高上限后重试')
    }
    throw new Error('AI 返回为空（若使用 deepseek-r1 等推理模型，请改用普通聊天模型）')
  }

  let generated: LocalExampleItem[]
  try {
    generated = parseExamples(extractJsonObject(result.text))
  } catch (err) {
    console.warn('[ExampleGen] JSON 解析失败，原文片段:', result.text.slice(0, 240))
    throw err instanceof Error ? err : new Error('模型未返回合法 JSON')
  }

  if (generated.length === 0) throw new Error('AI 未返回可用例句')

  const previousUser = await getUserExamplesForWord(key)
  const merged = mergeExamples(previousUser, generated)
  await putLocalExamplesForWord(key, merged)

  return generated
}
