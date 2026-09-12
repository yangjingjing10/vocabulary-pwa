import { inject, onMounted, onUnmounted, provide, type InjectionKey, type Ref } from 'vue'
import { useArticleStrokes } from './useArticleStrokes'
import type { DrawingStroke } from '../types/drawing'

type ArticleDrawingStore = ReturnType<typeof useArticleStrokes>

const ARTICLE_DRAWING_KEY: InjectionKey<ArticleDrawingStore> = Symbol('article-drawing')

/** 在段落列表根节点提供共享笔画仓库（避免每个段落各加载一份） */
export function provideArticleDrawing(articleId: string) {
  const store = useArticleStrokes(articleId)

  const onPageHide = () => {
    void store.flushSave()
  }

  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      void store.flushSave()
    }
  }

  onMounted(() => {
    void store.load()
    window.addEventListener('pagehide', onPageHide)
    document.addEventListener('visibilitychange', onVisibilityChange)
  })

  onUnmounted(() => {
    window.removeEventListener('pagehide', onPageHide)
    document.removeEventListener('visibilitychange', onVisibilityChange)
    void store.flushSave()
  })

  provide(ARTICLE_DRAWING_KEY, store)
  return store
}

export function useInjectedArticleDrawing(): ArticleDrawingStore {
  const store = inject(ARTICLE_DRAWING_KEY)
  if (!store) {
    throw new Error('useInjectedArticleDrawing() 必须在 provideArticleDrawing() 子树内使用')
  }
  return store
}

export function strokesForParagraph(
  strokes: Ref<DrawingStroke[]>,
  paragraphIndex: number
): DrawingStroke[] {
  return strokes.value.filter(
    s => typeof s.paragraphIndex === 'number' && s.paragraphIndex === paragraphIndex
  )
}
