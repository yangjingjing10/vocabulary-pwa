import { ref } from 'vue'
import { getAllArticles } from '@/db/repositories/articles.repository'
import { expandWordForms, highlightWordInText } from '../utils/highlightWord'

export interface WordContextSentence {
  articleId: string
  articleTitle: string
  sentence: string
  translation?: string
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
 * 检查句子中是否包含目标单词（仅整词 + 常见屈折，禁止模糊前缀）
 */
function sentenceContainsWord(sentence: string, targetWord: string): boolean {
  const forms = new Set(expandWordForms(targetWord))
  if (forms.size === 0) return false

  const tokens = sentence.toLowerCase().match(/[a-z0-9']+/g) || []
  return tokens.some((token) => forms.has(token))
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

          const highlightedSentence = highlightWordInText(sentence, word)
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
