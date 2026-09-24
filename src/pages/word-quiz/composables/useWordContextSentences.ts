import { ref } from 'vue'
import type { LocalExampleItem } from '@/db/schema/database'
import {
  ensureLocalDictionary,
  lookupLocalExamples,
} from '@/services/local-dictionary.service'
import { generateQualityExamplesForWord } from '@/services/example-generation.service'
import { highlightWordInText } from '../utils/highlightWord'
import {
  hasEnoughQualityExamples,
  selectQualityExamples,
} from '../utils/selectQualityExamples'

export interface WordContextSentence {
  sentence: string
  translation?: string
}

function toDisplaySentences(
  word: string,
  examples: LocalExampleItem[],
): WordContextSentence[] {
  return examples.map((item) => ({
    sentence: highlightWordInText(item.sentence, word),
    translation: item.translation || undefined,
  }))
}

/**
 * 精选本地例句；不够时可由 AI 生成并落库
 */
export function useWordContextSentences() {
  const sentences = ref<WordContextSentence[]>([])
  const isLoading = ref(false)
  const isGenerating = ref(false)
  const needsAiExamples = ref(false)
  const error = ref<string | null>(null)

  async function findSentencesByWord(word: string): Promise<void> {
    if (!word || !word.trim()) {
      sentences.value = []
      needsAiExamples.value = false
      return
    }

    isLoading.value = true
    error.value = null

    try {
      await ensureLocalDictionary()
      const raw = await lookupLocalExamples(word)
      const curated = selectQualityExamples(word, raw)
      sentences.value = toDisplaySentences(word, curated)
      needsAiExamples.value = !hasEnoughQualityExamples(curated)
    } catch (err) {
      console.error('Failed to find sentences:', err)
      error.value = err instanceof Error ? err.message : '查找例句失败'
      sentences.value = []
      needsAiExamples.value = true
    } finally {
      isLoading.value = false
    }
  }

  async function generateWithAi(word: string, gloss?: string): Promise<void> {
    if (!word.trim() || isGenerating.value) return

    isGenerating.value = true
    error.value = null

    try {
      const generated = await generateQualityExamplesForWord(word, gloss)
      const curated = selectQualityExamples(word, generated)
      const display = curated.length > 0 ? curated : generated.slice(0, 3)
      sentences.value = toDisplaySentences(word, display)
      needsAiExamples.value = !hasEnoughQualityExamples(display)
    } catch (err) {
      console.error('Failed to generate examples:', err)
      error.value = err instanceof Error ? err.message : 'AI 生成例句失败'
    } finally {
      isGenerating.value = false
    }
  }

  return {
    sentences,
    isLoading,
    isGenerating,
    needsAiExamples,
    error,
    findSentencesByWord,
    generateWithAi,
  }
}
