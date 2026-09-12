import { ref, computed, toValue, type MaybeRefOrGetter } from 'vue'
import type { ChoiceQuestion, ChoiceQuizResult, ChoiceQuizDetail } from '../types/choiceQuiz'
import { getActiveQuizPromptConfig } from '@/db/repositories/quiz-prompt-config.repository'
import { getApiConfig } from '@/db/repositories/api-config.repository'
import type { ApiConfig } from '@/db/schema/database'
import { selectPracticeWords } from '../../utils/selectPracticeWords'
import {
  getChoicePracticeState,
  getRemainingWrongWords,
  markWordsPracticed,
  mergePendingWrongWords,
} from '@/db/repositories/choice-practice-state.repository'
import { saveChoiceQuizRecord } from '@/db/repositories/choice-quiz-records.repository'

const CHUNK_SIZE = 5

export function useChoiceQuiz(
  words: MaybeRefOrGetter<string[]>,
  priorityWords: MaybeRefOrGetter<string[]> = [],
  date: MaybeRefOrGetter<string> = '',
  fillFromPool: MaybeRefOrGetter<boolean> = true,
) {
  const questions = ref<ChoiceQuestion[]>([])
  const currentIndex = ref(0)
  const userAnswers = ref<Map<string, string>>(new Map())
  const isCompleted = ref(false)
  const isGenerating = ref(false)
  const isSaving = ref(false)
  const result = ref<ChoiceQuizResult | null>(null)
  const selectedWords = ref<string[]>([])

  const currentQuestion = computed(() => {
    if (currentIndex.value >= questions.value.length) return null
    return questions.value[currentIndex.value]
  })

  const progress = computed(() => {
    if (questions.value.length === 0) return 0
    return Math.round(((currentIndex.value + 1) / questions.value.length) * 100)
  })

  const hasAnswer = computed(() => {
    if (!currentQuestion.value) return false
    return userAnswers.value.has(currentQuestion.value.id)
  })

  /**
   * 抽词并调用 AI 生成题目（每批最多 10，分块请求避免 JSON 截断）
   */
  async function generateQuestions(): Promise<boolean> {
    const pool = toValue(words)
    const incomingPriority = toValue(priorityWords)
    const practiceDate = toValue(date)

    if (pool.length === 0) {
      throw new Error('没有可用的单词')
    }

    const promptConfig = await getActiveQuizPromptConfig()
    if (!promptConfig || !promptConfig.content.trim()) {
      throw new Error('未配置选择题生成提示词，请先前往「设置 > 提示词配置 > 选择题配置」进行配置')
    }

    isGenerating.value = true

    try {
      let prioritize = incomingPriority
      let exclude: string[] = []

      if (practiceDate) {
        if (incomingPriority.length > 0) {
          await mergePendingWrongWords(practiceDate, incomingPriority)
        }
        const state = await getChoicePracticeState(practiceDate)
        prioritize = getRemainingWrongWords(state)
        exclude = state.practicedWords
      }

      const picked = selectPracticeWords(pool, {
        prioritize,
        exclude,
        batchSize: 10,
        fillFromPool: toValue(fillFromPool),
      })

      if (picked.length === 0) {
        throw new Error(
          toValue(fillFromPool) ? '没有更多可练习的单词了' : '没有更多错题了',
        )
      }

      selectedWords.value = picked

      const apiConfig = await getApiConfig()
      if (!apiConfig) {
        throw new Error('未配置 API，请先前往「设置 > API 配置」进行配置')
      }

      const chunks = chunkArray(picked, CHUNK_SIZE)
      const allQuestions: ChoiceQuestion[] = []

      for (let i = 0; i < chunks.length; i++) {
        const chunkQuestions = await requestChoiceQuestions(
          apiConfig,
          promptConfig.content,
          chunks[i],
          i * CHUNK_SIZE,
        )
        allQuestions.push(...chunkQuestions)
      }

      if (allQuestions.length === 0) {
        throw new Error('AI 未能生成有效的选择题，请重试')
      }

      questions.value = allQuestions
      currentIndex.value = 0
      userAnswers.value.clear()
      isCompleted.value = false
      result.value = null

      return true
    } catch (error) {
      console.error('生成选择题失败:', error)
      throw error
    } finally {
      isGenerating.value = false
    }
  }

  async function requestChoiceQuestions(
    apiConfig: ApiConfig,
    systemPrompt: string,
    wordChunk: string[],
    idOffset: number,
  ): Promise<ChoiceQuestion[]> {
    const userPrompt =
      `请为以下 ${wordChunk.length} 个单词生成选择题。\n` +
      `单词：${wordChunk.join(', ')}\n\n` +
      `严格要求：\n` +
      `1. 每个单词一道单选题，共 ${wordChunk.length} 题\n` +
      `2. options 必须是长度为 4 的字符串数组\n` +
      `3. correctAnswer 必须是 options 中的某一项原文\n` +
      `4. explanation 控制在 20 字以内\n` +
      `5. 题干中不要直接写出正确答案单词\n` +
      `6. 只返回 JSON，不要 markdown，不要其它说明\n` +
      `格式：{"questions":[{"word":"","question":"","options":["","","",""],"correctAnswer":"","explanation":""}]}`

    const response = await fetch(`${normalizeBaseUrl(apiConfig.baseUrl)}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiConfig.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: apiConfig.textModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 2500,
      }),
    })

    const rawText = await response.text()
    let data: any
    try {
      data = JSON.parse(rawText)
    } catch {
      throw new Error(`API 返回无法解析（HTTP ${response.status}）`)
    }

    if (!response.ok) {
      throw new Error(formatApiError(response.status, data))
    }

    const choice = data.choices?.[0]
    const aiResponse = choice?.message?.content || ''
    const finishReason = choice?.finish_reason

    if (!aiResponse) {
      throw new Error('AI 未返回有效响应')
    }

    if (finishReason === 'length') {
      console.warn('[ChoiceQuiz] 响应因 max_tokens 被截断，尝试抢救已生成题目')
    }

    const parsed = parseAIResponse(aiResponse, idOffset)
    if (parsed.length === 0) {
      throw new Error(
        finishReason === 'length'
          ? '题目生成不完整（输出被截断），请重试'
          : 'AI 返回格式异常，请重试',
      )
    }

    return parsed
  }

  function parseAIResponse(response: string, idOffset = 0): ChoiceQuestion[] {
    const jsonStr = extractJsonText(response)
    let questionsArray: any[] = []

    try {
      const parsed = JSON.parse(jsonStr)
      questionsArray = Array.isArray(parsed) ? parsed : (parsed.questions || [])
    } catch (error) {
      console.warn('完整 JSON 解析失败，尝试抢救截断内容:', error)
      questionsArray = salvagePartialQuestions(jsonStr)
    }

    return questionsArray
      .map((q: any) => {
        const options = normalizeChoiceOptions(q?.options)
        return { ...q, options }
      })
      .filter((q) => q && (q.word || q.question) && q.options.length >= 2)
      .map((q: any, index: number) => {
        const options = q.options as string[]
        let correctAnswer = q.correctAnswer || q.correct_answer || ''
        if (correctAnswer && !options.includes(correctAnswer)) {
          const letter = String(correctAnswer).trim().toUpperCase()
          const letterIndex = ['A', 'B', 'C', 'D'].indexOf(letter)
          if (letterIndex >= 0 && options[letterIndex]) {
            correctAnswer = options[letterIndex]
          }
        }
        return {
          id: `q-${Date.now()}-${idOffset + index}`,
          word: q.word || '',
          question: q.question || '',
          options,
          correctAnswer,
          explanation: q.explanation || '',
        }
      })
  }

  function selectAnswer(questionId: string, answer: string) {
    userAnswers.value.set(questionId, answer)
  }

  function nextQuestion() {
    if (currentIndex.value < questions.value.length - 1) {
      currentIndex.value++
      return true
    }
    return false
  }

  function previousQuestion() {
    if (currentIndex.value > 0) {
      currentIndex.value--
      return true
    }
    return false
  }

  function goToQuestion(index: number) {
    if (index >= 0 && index < questions.value.length) {
      currentIndex.value = index
    }
  }

  async function submitQuiz(): Promise<ChoiceQuizResult> {
    const details: ChoiceQuizDetail[] = questions.value.map((q) => {
      const userAnswer = userAnswers.value.get(q.id) || ''
      const isCorrect = userAnswer === q.correctAnswer

      return {
        questionId: q.id,
        word: q.word,
        question: q.question,
        options: [...(q.options || [])],
        userAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect,
        explanation: q.explanation,
      }
    })

    const correct = details.filter((d) => d.isCorrect).length
    const total = questions.value.length
    const wrong = total - correct
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0

    const quizResult: ChoiceQuizResult = {
      total,
      correct,
      wrong,
      accuracy,
      details,
    }

    result.value = quizResult
    isCompleted.value = true

    const practiceDate = toValue(date)
    if (practiceDate) {
      isSaving.value = true
      try {
        const usedWords = details.map((d) => d.word).filter(Boolean)
        await saveChoiceQuizRecord({
          date: practiceDate,
          total,
          correct,
          wrong,
          accuracy,
          words: usedWords,
          details: details.map((d) => ({
            word: d.word,
            question: d.question,
            options: d.options,
            userAnswer: d.userAnswer,
            correctAnswer: d.correctAnswer,
            isCorrect: d.isCorrect,
            explanation: d.explanation,
          })),
        })
        await markWordsPracticed(practiceDate, usedWords)
      } catch (error) {
        console.error('保存选择题记录失败:', error)
      } finally {
        isSaving.value = false
      }
    }

    return quizResult
  }

  function resetQuiz() {
    currentIndex.value = 0
    userAnswers.value.clear()
    isCompleted.value = false
    result.value = null
    selectedWords.value = []
  }

  return {
    questions,
    currentIndex,
    currentQuestion,
    userAnswers,
    isCompleted,
    isGenerating,
    isSaving,
    result,
    selectedWords,
    progress,
    hasAnswer,
    generateQuestions,
    selectAnswer,
    nextQuestion,
    previousQuestion,
    goToQuestion,
    submitQuiz,
    resetQuiz,
  }
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '')
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

function formatApiError(status: number, data: any): string {
  const msg =
    data?.error?.message ||
    data?.message ||
    data?.error?.code ||
    ''

  const lower = String(msg).toLowerCase()
  if (
    status === 402 ||
    status === 429 ||
    lower.includes('quota') ||
    lower.includes('balance') ||
    lower.includes('billing') ||
    lower.includes('insufficient') ||
    msg.includes('余额') ||
    msg.includes('欠费')
  ) {
    return `API 额度不足或限流：${msg || status}`
  }

  return `API 请求失败（${status}）${msg ? `：${msg}` : ''}`
}

function extractJsonText(response: string): string {
  let jsonStr = response.trim()

  const fence = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence?.[1]) {
    jsonStr = fence[1].trim()
  }

  const objStart = jsonStr.indexOf('{')
  const arrStart = jsonStr.indexOf('[')
  let start = -1
  if (objStart >= 0 && arrStart >= 0) start = Math.min(objStart, arrStart)
  else start = Math.max(objStart, arrStart)

  if (start > 0) jsonStr = jsonStr.slice(start)

  return jsonStr.trim()
}

/** 统一把 AI 返回的 options 转成 string[] */
function normalizeChoiceOptions(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw
      .map((item) => {
        if (typeof item === 'string') return item.trim()
        if (item && typeof item === 'object') {
          const obj = item as Record<string, unknown>
          return String(obj.text ?? obj.label ?? obj.value ?? obj.content ?? '').trim()
        }
        return String(item ?? '').trim()
      })
      .filter(Boolean)
      .slice(0, 4)
  }

  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>
    return ['A', 'B', 'C', 'D', 'a', 'b', 'c', 'd']
      .map((key) => obj[key])
      .filter((v) => v != null && String(v).trim())
      .map((v) => String(v).trim())
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .slice(0, 4)
  }

  return []
}

/** 从被截断的 JSON 里尽量抠出完整的题目对象 */
function salvagePartialQuestions(jsonStr: string): any[] {
  const results: any[] = []
  const objectPattern = /\{[^{}]*"word"\s*:\s*"[^"]*"[\s\S]*?\}/g
  const matches = jsonStr.match(objectPattern) || []

  for (const raw of matches) {
    try {
      // 补全可能缺失的 options 收尾
      let candidate = raw
      if (!candidate.includes('"options"')) continue
      const parsed = JSON.parse(candidate)
      if (parsed?.word && Array.isArray(parsed.options)) {
        results.push(parsed)
      }
    } catch {
      // 尝试给未闭合的 options 数组补 ]
      try {
        let fixed = raw
        if ((fixed.match(/\[/g) || []).length > (fixed.match(/\]/g) || []).length) {
          fixed += ']'.repeat(
            (fixed.match(/\[/g) || []).length - (fixed.match(/\]/g) || []).length,
          )
        }
        if ((fixed.match(/\{/g) || []).length > (fixed.match(/\}/g) || []).length) {
          fixed += '}'.repeat(
            (fixed.match(/\{/g) || []).length - (fixed.match(/\}/g) || []).length,
          )
        }
        const parsed = JSON.parse(fixed)
        if (parsed?.word && Array.isArray(parsed.options)) {
          results.push(parsed)
        }
      } catch {
        // skip
      }
    }
  }

  return results
}
