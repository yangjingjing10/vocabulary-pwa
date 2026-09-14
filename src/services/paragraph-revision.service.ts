import { getApiConfig } from '@/db/repositories/api-config.repository'

export interface ParagraphRevisionInput {
  index: number
  english: string
  userTranslation: string
}

export interface ParagraphRevisionResult {
  index: number
  revised: string
}

const SYSTEM_PROMPT = `你是一位英语阅读老师，帮助学生把「英译中」译文改得更准确、自然。

要求：
1. 对照英文原文，纠正漏译、误译、语序别扭、用词不当。
2. 保留学生原意与语气，不要大幅扩写或缩写。
3. 只输出润色后的中文译文，不要解释。
4. 严格返回 JSON，不要 markdown 代码块。`

function buildUserPrompt(items: ParagraphRevisionInput[]) {
  const blocks = items
    .map(
      (item, i) =>
        `【段落 ${i + 1} | index=${item.index}】\n英文：${item.english}\n学生译文：${item.userTranslation}`,
    )
    .join('\n\n')

  return `请修改下列已翻译段落。只处理给出的段落。

${blocks}

输出格式（仅 JSON）：
{"revisions":[{"index":数字,"revised":"润色后的中文译文"}]}`
}

function extractJsonText(raw: string): string {
  const cleaned = raw
    .replace(/```json\s*/gi, '')
    .replace(/```/g, '')
    .trim()
  const match = cleaned.match(/\{[\s\S]*\}/)
  return match?.[0] ?? cleaned
}

function parseRevisions(raw: string, expected: ParagraphRevisionInput[]): ParagraphRevisionResult[] {
  const jsonText = extractJsonText(raw)
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    throw new Error('AI 返回格式无法解析')
  }

  const list = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as { revisions?: unknown }).revisions)
      ? (parsed as { revisions: unknown[] }).revisions
      : null

  if (!list) {
    throw new Error('AI 未返回 revisions')
  }

  const byIndex = new Map<number, string>()
  for (const item of list) {
    if (!item || typeof item !== 'object') continue
    const row = item as { index?: unknown; revised?: unknown; translation?: unknown }
    const index = Number(row.index)
    const revised = String(row.revised ?? row.translation ?? '').trim()
    if (!Number.isFinite(index) || !revised) continue
    byIndex.set(index, revised)
  }

  // 若模型没用 index，按顺序回填
  if (byIndex.size === 0 && list.length === expected.length) {
    return expected.map((item, i) => {
      const row = list[i] as { revised?: unknown; translation?: unknown } | string
      const revised =
        typeof row === 'string'
          ? row.trim()
          : String(row?.revised ?? row?.translation ?? '').trim()
      return { index: item.index, revised }
    }).filter((item) => item.revised)
  }

  return expected
    .map((item) => ({
      index: item.index,
      revised: byIndex.get(item.index) ?? '',
    }))
    .filter((item) => item.revised)
}

/**
 * 批量润色已翻译段落（未翻译的不要传入）。
 */
export async function reviseParagraphTranslations(
  items: ParagraphRevisionInput[],
): Promise<ParagraphRevisionResult[]> {
  if (items.length === 0) return []

  const apiConfig = await getApiConfig()
  if (!apiConfig?.apiKey) {
    throw new Error('请先配置 API Key')
  }

  const baseUrl = apiConfig.baseUrl.trim().replace(/\/+$/, '')
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiConfig.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: apiConfig.textModel,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(items) },
      ],
      temperature: 0.3,
    }),
  })

  if (!response.ok) {
    throw new Error(`API 请求失败：${response.status}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('AI 未返回内容')
  }

  return parseRevisions(String(content), items)
}
