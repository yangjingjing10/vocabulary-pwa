/**
 * 兼容各类 OpenAI 风格 chat/completions 响应的文本提取
 *（含 content 为数组、reasoning 模型、部分中转字段）
 */

export function extractChatCompletionText(data: unknown): {
  text: string
  finishReason?: string
  hadReasoningOnly: boolean
} {
  const choice = (data as { choices?: unknown[] } | null)?.choices?.[0] as
    | {
        finish_reason?: string
        message?: Record<string, unknown>
        text?: string
        delta?: Record<string, unknown>
      }
    | undefined

  if (!choice) {
    return { text: '', hadReasoningOnly: false }
  }

  const message = choice.message || choice.delta || {}
  const fromContent = normalizeContentField(message.content)
  const fromReasoning = normalizeContentField(
    message.reasoning_content ?? message.reasoning ?? message.thinking,
  )
  const fromText = typeof choice.text === 'string' ? choice.text.trim() : ''

  // 优先正式回复；若为空则尝试从 reasoning 里捞 JSON（部分推理模型会把答案写在思考里）
  let text = fromContent || fromText
  let hadReasoningOnly = false
  if (!text && fromReasoning) {
    hadReasoningOnly = true
    text = fromReasoning
  }

  return {
    text: text.trim(),
    finishReason: choice.finish_reason,
    hadReasoningOnly,
  }
}

function normalizeContentField(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value.trim()
  if (Array.isArray(value)) {
    return value
      .map((part) => {
        if (typeof part === 'string') return part
        if (!part || typeof part !== 'object') return ''
        const obj = part as { text?: unknown; content?: unknown; type?: string }
        if (typeof obj.text === 'string') return obj.text
        if (typeof obj.content === 'string') return obj.content
        return ''
      })
      .join('')
      .trim()
  }
  return ''
}
