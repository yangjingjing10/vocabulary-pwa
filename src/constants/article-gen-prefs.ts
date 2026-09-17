/** AI 主题短文：先定篇数，再均分单词 */

export interface ArticleGenPrefs {
  /** 本轮固定生成几篇（单词均分到这些篇） */
  articleCount: number
}

export const ARTICLE_GEN_PREFS_KEY = 'app_article_gen_prefs'

export const DEFAULT_ARTICLE_GEN_PREFS: ArticleGenPrefs = {
  articleCount: 5,
}

export const ARTICLE_COUNT_OPTIONS = [2, 3, 4, 5, 6, 8, 10, 12, 15] as const

export const SAFETY_MAX_ARTICLES = 20

export function loadArticleGenPrefs(): ArticleGenPrefs {
  try {
    const raw = localStorage.getItem(ARTICLE_GEN_PREFS_KEY)
    if (!raw) return { ...DEFAULT_ARTICLE_GEN_PREFS }
    const parsed = JSON.parse(raw) as Partial<ArticleGenPrefs> & {
      /** 兼容旧字段 */
      maxArticles?: number
      wordsPerArticle?: number
    }
    let count = Number(parsed.articleCount)
    // 旧版：用 maxArticles 当篇数；0 表示用完为止 → 默认 5
    if (!Number.isFinite(count) || count <= 0) {
      const legacy = Number(parsed.maxArticles)
      count =
        Number.isFinite(legacy) && legacy > 0
          ? legacy
          : DEFAULT_ARTICLE_GEN_PREFS.articleCount
    }
    count = Math.max(1, Math.min(SAFETY_MAX_ARTICLES, Math.floor(count)))
    return { articleCount: count }
  } catch {
    return { ...DEFAULT_ARTICLE_GEN_PREFS }
  }
}

export function saveArticleGenPrefs(prefs: ArticleGenPrefs) {
  localStorage.setItem(
    ARTICLE_GEN_PREFS_KEY,
    JSON.stringify({
      articleCount: Math.max(1, Math.min(SAFETY_MAX_ARTICLES, Math.floor(prefs.articleCount))),
    }),
  )
}

/** 将单词尽量均分到 articleCount 篇（余数摊到前几篇） */
export function splitWordsEvenly(words: string[], articleCount: number): string[][] {
  const unique = Array.from(
    new Set(words.map((w) => w.trim()).filter(Boolean)),
  )
  if (!unique.length) return []

  const n = Math.min(Math.max(1, Math.floor(articleCount)), unique.length, SAFETY_MAX_ARTICLES)
  const base = Math.floor(unique.length / n)
  const rem = unique.length % n
  const chunks: string[][] = []
  let offset = 0
  for (let i = 0; i < n; i++) {
    const size = base + (i < rem ? 1 : 0)
    if (size <= 0) continue
    chunks.push(unique.slice(offset, offset + size))
    offset += size
  }
  return chunks
}
