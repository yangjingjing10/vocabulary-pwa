import { ref } from 'vue'
import type { LocalExampleItem } from '@/db/schema/database'
import { getUserExamplesForWord } from '@/db/repositories/local-dict.repository'
import {
  ensureLocalDictionary,
  lookupLocalExamples,
} from '@/services/local-dictionary.service'
import { generateQualityExamplesForWord } from '@/services/example-generation.service'
import { highlightWordInText } from '../utils/highlightWord'
import {
  hasEnoughQualityExamples,
  QUALITY_EXAMPLE_LIMIT,
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

/** 展示用：优先精选；精选为空时回退原文，避免已落库例句被打分筛光 */
function pickDisplayExamples(
  word: string,
  examples: LocalExampleItem[],
): LocalExampleItem[] {
  if (!examples.length) return []
  const curated = selectQualityExamples(word, examples)
  return curated.length > 0 ? curated : examples.slice(0, QUALITY_EXAMPLE_LIMIT)
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
      const key = word.trim().toLowerCase()
      // 用户/AI 例句已落库则直接复用，不再因质量分过严而反复提示生成
      const userExamples = await getUserExamplesForWord(key)
      if (userExamples.length > 0) {
        sentences.value = toDisplaySentences(word, pickDisplayExamples(word, userExamples))
        needsAiExamples.value = false
        return
      }

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
      sentences.value = toDisplaySentences(word, pickDisplayExamples(word, generated))
      // 已成功落库，下次同一词直接读库，不再显示生成按钮
      needsAiExamples.value = false
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
