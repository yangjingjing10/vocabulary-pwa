import { ref } from 'vue'
import { getAllArticles } from '@/db/repositories/articles.repository'

export interface WordContextSentence {
  articleId: string
  articleTitle: string
  sentence: string
  translation?: string
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 从 HTML 内容中提取纯文本句子
 */
function extractSentencesFromHtml(htmlContent: string): string[] {
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = htmlContent

  const textContent = (tempDiv.textContent || tempDiv.innerText || '')
    .replace(/\s+/g, ' ')
    .trim()

  if (!textContent) return []

  return textContent
    .split(/(?<=[.!?。！？])\s+/)
    .map((s) => s.trim())
    .filter((s) => {
      if (s.length < 8) return false
      const wordCount = (s.match(/[A-Za-z]+/g) || []).length
      return wordCount >= 4
    })
}

/**
 * 生成目标词的常见屈折形式（严格集合，不做模糊前缀匹配）
 */
function expandWordForms(word: string): string[] {
  const w = word.toLowerCase().trim()
  if (!w) return []

  const forms = new Set<string>([w])

  forms.add(`${w}s`)
  forms.add(`${w}es`)
  forms.add(`${w}ed`)
  forms.add(`${w}ing`)

  if (w.endsWith('e') && w.length > 2) {
    forms.add(`${w}d`)
    forms.add(`${w.slice(0, -1)}ing`)
  }

  if (w.endsWith('y') && w.length > 2 && !/[aeiou]y$/.test(w)) {
    forms.add(`${w.slice(0, -1)}ies`)
    forms.add(`${w.slice(0, -1)}ied`)
  }

  if (w.endsWith('ies') && w.length > 4) {
    forms.add(`${w.slice(0, -3)}y`)
  }

  if (w.endsWith('es') && w.length > 3) {
    forms.add(w.slice(0, -2))
    forms.add(w.slice(0, -1))
  } else if (w.endsWith('s') && w.length > 2) {
    forms.add(w.slice(0, -1))
  }

  if (w.endsWith('ing') && w.length > 5) {
    const stem = w.slice(0, -3)
    forms.add(stem)
    forms.add(`${stem}e`)
    if (stem.length >= 2 && stem.at(-1) === stem.at(-2)) {
      forms.add(stem.slice(0, -1))
    }
  }

  if (w.endsWith('ed') && w.length > 3) {
    const stem = w.slice(0, -2)
    forms.add(stem)
    forms.add(`${stem}e`)
    forms.add(w.slice(0, -1))
  }

  return [...forms].filter((form) => form.length >= 2)
}

/**
 * 检查句子中是否包含目标单词（仅整词 + 常见屈折，禁止模糊前缀）
 */
function sentenceContainsWord(sentence: string, targetWord: string): boolean {
  const forms = new Set(expandWordForms(targetWord))
  if (forms.size === 0) return false

  const tokens = sentence.toLowerCase().match(/[a-z0-9']+/g) || []
  return tokens.some((token) => forms.has(token))
}

/**
 * 高亮句子中的目标单词（仅高亮匹配到的屈折形式）
 */
function highlightWordInSentence(sentence: string, targetWord: string): string {
  const forms = expandWordForms(targetWord).sort((a, b) => b.length - a.length)
  if (forms.length === 0) return sentence

  const pattern = forms.map(escapeRegExp).join('|')
  const regex = new RegExp(`\\b(${pattern})\\b`, 'gi')
  return sentence.replace(regex, '<mark>$1</mark>')
}

/**
 * 从所有文章中查找包含指定单词的句子
 */
export function useWordContextSentences() {
  const sentences = ref<WordContextSentence[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function findSentencesByWord(word: string): Promise<void> {
    if (!word || !word.trim()) {
      sentences.value = []
      return
    }

    isLoading.value = true
    error.value = null

    try {
      const articles = await getAllArticles()
      const foundSentences: WordContextSentence[] = []
      const seen = new Set<string>()

      for (const article of articles) {
        const articleSentences = extractSentencesFromHtml(article.content)

        for (const sentence of articleSentences) {
          if (!sentenceContainsWord(sentence, word)) continue

          const highlightedSentence = highlightWordInSentence(sentence, word)
          // 安全阀：高亮失败说明匹配不可靠，直接丢弃
          if (!highlightedSentence.includes('<mark>')) continue

          const dedupeKey = `${article.id}::${sentence.toLowerCase()}`
          if (seen.has(dedupeKey)) continue
          seen.add(dedupeKey)

          foundSentences.push({
            articleId: article.id,
            articleTitle: article.title,
            sentence: highlightedSentence,
            translation: undefined,
          })
        }
      }

      sentences.value = foundSentences
    } catch (err) {
      console.error('Failed to find sentences:', err)
      error.value = err instanceof Error ? err.message : '查找句子失败'
      sentences.value = []
    } finally {
      isLoading.value = false
    }
  }

  return {
    sentences,
    isLoading,
    error,
    findSentencesByWord,
  }
}
