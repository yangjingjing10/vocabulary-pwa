import { initDatabase } from '../index'

export interface ParagraphTranslation {
  articleId: string
  paragraphIndex: number
  userTranslation: string
  aiRevisedTranslation?: string
  /** 采纳后用于继续渲染 Diff 的「修改前」原文 */
  diffBaseTranslation?: string
  updatedAt: number
}

export async function saveParagraphTranslation(translation: ParagraphTranslation): Promise<void> {
  const db = await initDatabase()
  const key = `${translation.articleId}-${translation.paragraphIndex}`
  await db.put('paragraphTranslations', { ...translation, id: key })
}

export async function getParagraphTranslations(articleId: string): Promise<ParagraphTranslation[]> {
  const db = await initDatabase()
  const allTranslations = await db.getAll('paragraphTranslations')
  return allTranslations.filter(t => t.articleId === articleId)
}

export async function getParagraphTranslation(
  articleId: string, 
  paragraphIndex: number
): Promise<ParagraphTranslation | undefined> {
  const db = await initDatabase()
  const key = `${articleId}-${paragraphIndex}`
  return db.get('paragraphTranslations', key)
}

export async function deleteParagraphTranslations(articleId: string): Promise<void> {
  const db = await initDatabase()
  const translations = await getParagraphTranslations(articleId)
  
  for (const translation of translations) {
    const key = `${translation.articleId}-${translation.paragraphIndex}`
    await db.delete('paragraphTranslations', key)
  }
}
