import { initDatabase } from '../index'
import type { ArticleDrawing, DrawingStroke } from '../schema/database'

export type { ArticleDrawing, DrawingStroke }

export async function getArticleDrawing(articleId: string): Promise<ArticleDrawing | undefined> {
  const db = await initDatabase()
  return db.get('articleDrawings', articleId)
}

export async function saveArticleDrawing(
  articleId: string,
  strokes: DrawingStroke[]
): Promise<void> {
  const db = await initDatabase()
  const record: ArticleDrawing = {
    id: articleId,
    articleId,
    strokes,
    updatedAt: Date.now()
  }
  await db.put('articleDrawings', record)
}

export async function clearArticleDrawing(articleId: string): Promise<void> {
  const db = await initDatabase()
  await db.delete('articleDrawings', articleId)
}
