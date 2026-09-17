import { initDatabase } from '../index'
import type { Article, ArticleSourceRef } from '../schema/database'
import { clearArticleDrawing } from './article-drawings.repository'
import { deleteParagraphTranslations } from './paragraph-translation.repository'

function plainSources(sources: ArticleSourceRef[] | undefined): ArticleSourceRef[] | undefined {
  if (!sources?.length) return undefined
  return sources.map((s) => ({
    title: String(s.title ?? ''),
    link: String(s.link ?? ''),
    outlet: s.outlet ? String(s.outlet) : undefined,
  }))
}

/** IndexedDB 不能 structured clone Vue Proxy，落库前转成纯对象。 */
export function toPlainArticle(article: Article): Article {
  const plain: Article = {
    id: String(article.id),
    title: String(article.title ?? ''),
    content: String(article.content ?? ''),
    words: Array.from(article.words ?? [], (word) => String(word)),
    date: String(article.date ?? ''),
    createdAt: Number(article.createdAt),
  }
  if (article.kind) plain.kind = article.kind
  if (article.theme) plain.theme = String(article.theme)
  if (article.link) plain.link = String(article.link)
  const sources = plainSources(article.sources)
  if (sources) plain.sources = sources
  return plain
}

export async function addArticle(article: Article): Promise<void> {
  const db = await initDatabase()
  await db.add('articles', toPlainArticle(article))
}

/** 存在则覆盖（用于新闻打开时幂等保存） */
export async function putArticle(article: Article): Promise<void> {
  const db = await initDatabase()
  await db.put('articles', toPlainArticle(article))
}

export async function getArticlesByDate(date: string): Promise<Article[]> {
  const db = await initDatabase()
  const list = await db.getAllFromIndex('articles', 'by-date', date)
  return list.sort((a, b) => b.createdAt - a.createdAt)
}

export async function getAllArticles(): Promise<Article[]> {
  const db = await initDatabase()
  const articles = await db.getAll('articles')
  return articles.sort((a, b) => b.createdAt - a.createdAt)
}

export async function getArticle(id: string): Promise<Article | undefined> {
  const db = await initDatabase()
  return db.get('articles', id)
}

export async function findArticleByLink(date: string, link: string): Promise<Article | undefined> {
  const list = await getArticlesByDate(date)
  return list.find((a) => a.link === link || a.sources?.some((s) => s.link === link))
}

export async function deleteArticle(id: string): Promise<void> {
  const db = await initDatabase()
  await db.delete('articles', id)
  await Promise.all([
    clearArticleDrawing(id),
    deleteParagraphTranslations(id),
  ])
}
