import { computed, ref } from 'vue'
import { addArticle } from '@/db/repositories/articles.repository'
import { getApiConfig } from '@/db/repositories/api-config.repository'
import { getActivePromptConfig } from '@/db/repositories/prompt-config.repository'
import type { Article } from '@/db/schema/database'
import { todayLocalDate } from '@/utils/localDate'

export type ArticleGenStatus = 'idle' | 'generating' | 'success' | 'error'

export interface ArticleGenResult {
  article: Article
  words: string[]
}

type Listener = (event: {
  status: ArticleGenStatus
  article?: Article
  error?: string
  words: string[]
}) => void

function formatContentAsParagraphs(raw: string): string {
  if (raw.includes('<p>')) return raw
  return raw
    .split('\n\n')
    .filter((para) => para.trim())
    .map((para) => `<p>${para.trim()}</p>`)
    .join('\n')
}

function highlightWords(body: string, words: string[]): string {
  let result = body
  words.forEach((word) => {
    const regex = new RegExp(`\\b(${word})\\b`, 'gi')
    result = result.replace(regex, '<mark>$1</mark>')
  })
  return result
}

function buildSystemPrompt(promptConfig: { content?: string } | null | undefined) {
  if (promptConfig?.content) return promptConfig.content
  return `You are an expert English teacher creating engaging articles for exam preparation. Write naturally and coherently while incorporating the given vocabulary words seamlessly into the content. The article should be well-structured with a clear title.

Important: Start your response with a title on the first line, then write the article body.`
}

function buildUserPrompt(words: string[]) {
  const wordCount = Math.max(200, Math.min(800, words.length * 40))
  return `Write an approximately ${wordCount}-word article that naturally incorporates these vocabulary words: ${words.join(', ')}. 

Choose an appropriate theme based on the vocabulary provided. Make the article engaging, coherent, and educational. Use each word naturally in context.`
}

/**
 * 文章生成单例：离开页面后仍继续请求，完成后落库并通知 UI。
 */
class ArticleGenerationService {
  readonly status = ref<ArticleGenStatus>('idle')
  readonly lastError = ref('')
  readonly lastArticle = ref<Article | null>(null)
  readonly lastWords = ref<string[]>([])
  readonly sessionArticles = ref<Article[]>([])

  private listeners = new Set<Listener>()
  private runId = 0

  readonly isGenerating = computed(() => this.status.value === 'generating')

  subscribe(listener: Listener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private emit() {
    const payload = {
      status: this.status.value,
      article: this.lastArticle.value ?? undefined,
      error: this.lastError.value || undefined,
      words: [...this.lastWords.value],
    }
    this.listeners.forEach((fn) => fn(payload))
  }

  clearSession() {
    this.sessionArticles.value = []
  }

  removeFromSession(id: string) {
    this.sessionArticles.value = this.sessionArticles.value.filter((article) => article.id !== id)
  }

  /**
   * 启动后台生成。若已在生成中则忽略（避免重复请求）。
   * session: append 追加到当前会话；replace 先清空再写入；none 只落库不改会话。
   */
  async start(
    words: string[],
    options: {
      appendToSession?: boolean
      session?: 'append' | 'replace' | 'none'
      date?: string
    } = {},
  ): Promise<Article | null> {
    const plainWords = Array.from(words ?? [], (word) => String(word))
    if (!plainWords.length) {
      this.status.value = 'error'
      this.lastError.value = '未选择单词'
      this.emit()
      return null
    }

    if (this.status.value === 'generating') {
      return null
    }

    const sessionMode: 'append' | 'replace' | 'none' =
      options.session ?? (options.appendToSession === false ? 'replace' : 'append')
    if (sessionMode === 'replace') {
      this.sessionArticles.value = []
    }

    const currentRun = ++this.runId
    this.status.value = 'generating'
    this.lastError.value = ''
    this.lastWords.value = plainWords
    this.emit()

    try {
      const apiConfig = await getApiConfig()
      const promptConfig = await getActivePromptConfig()

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
            { role: 'system', content: buildSystemPrompt(promptConfig) },
            { role: 'user', content: buildUserPrompt(plainWords) },
          ],
          temperature: 0.7,
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

      const lines = String(content)
        .split('\n')
        .filter((line: string) => line.trim())
      const articleTitle = lines[0].replace(/^#+\s*/, '')
      let articleBody = lines.slice(1).join('\n\n')
      articleBody = highlightWords(articleBody, plainWords)
      articleBody = formatContentAsParagraphs(articleBody)

      const article: Article = {
        id: `article-${Date.now()}`,
        title: articleTitle,
        content: articleBody,
        words: [...plainWords],
        date: options.date || todayLocalDate(),
        createdAt: Date.now(),
      }

      await addArticle(article)

      // 若期间又启动了新任务，丢弃旧结果的 UI 更新（库已写入）
      if (currentRun !== this.runId) return article

      this.lastArticle.value = article
      if (sessionMode === 'append') {
        this.sessionArticles.value = [article, ...this.sessionArticles.value]
      } else if (sessionMode === 'replace') {
        this.sessionArticles.value = [article]
      }
      this.status.value = 'success'
      this.emit()
      return article
    } catch (error) {
      if (currentRun !== this.runId) return null
      this.status.value = 'error'
      this.lastError.value = error instanceof Error ? error.message : '生成失败'
      this.emit()
      console.error('[article-gen]', error)
      return null
    }
  }
}

export const articleGenerationService = new ArticleGenerationService()
