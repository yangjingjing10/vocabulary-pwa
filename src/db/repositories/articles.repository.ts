import { initDatabase } from '../index'
import type { Article } from '../schema/database'
import { clearArticleDrawing } from './article-drawings.repository'
import { deleteParagraphTranslations } from './paragraph-translation.repository'

/** IndexedDB 不能 structured clone Vue Proxy，落库前转成纯对象。 */
export function toPlainArticle(article: Article): Article {
  return {
    id: String(article.id),
    title: String(article.title ?? ''),
    content: String(article.content ?? ''),
    words: Array.from(article.words ?? [], (word) => String(word)),
    date: String(article.date ?? ''),
    createdAt: Number(article.createdAt),
  }
}

export async function addArticle(article: Article): Promise<void> {
  const db = await initDatabase()
  await db.add('articles', toPlainArticle(article))
}

export async function getArticlesByDate(date: string): Promise<Article[]> {
  const db = await initDatabase()
  return db.getAllFromIndex('articles', 'by-date', date)
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

export async function deleteArticle(id: string): Promise<void> {
  const db = await initDatabase()
  await db.delete('articles', id)
  await Promise.all([
    clearArticleDrawing(id),
    deleteParagraphTranslations(id),
  ])
}
