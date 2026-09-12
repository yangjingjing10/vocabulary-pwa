import { initDatabase } from '../index'
import type { Article } from '../schema/database'

export async function addArticle(article: Article): Promise<void> {
  const db = await initDatabase()
  await db.add('articles', article)
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
}
