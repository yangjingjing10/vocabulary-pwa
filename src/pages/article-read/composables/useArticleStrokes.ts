import { ref, onUnmounted } from 'vue'
import {
  getArticleDrawing,
  saveArticleDrawing
} from '@/db/repositories/article-drawings.repository'
import type { DrawingStroke } from '../types/drawing'

/**
 * 单篇文章的笔画加载 / 即时落盘
 * （离开页面时也会再 flush 一次，避免丢笔）
 */
export function useArticleStrokes(articleId: string) {
  const strokes = ref<DrawingStroke[]>([])
  const isLoaded = ref(false)
  let dirty = false
  let saving: Promise<void> | null = null

  async function load() {
    try {
      const record = await getArticleDrawing(articleId)
      const incoming = (record?.strokes ?? [])
        .filter(
          (s): s is DrawingStroke =>
            typeof s.paragraphIndex === 'number' && s.paragraphIndex >= 0
        )
        .map((s) => ({
          id: s.id,
          paragraphIndex: s.paragraphIndex,
          color: s.color,
          width: s.width,
          points: s.points,
          createdAt: s.createdAt,
        }))

      // 加载完成前若已有本地笔画，按 id 合并，避免被覆盖丢失
      if (strokes.value.length > 0) {
        const map = new Map<string, DrawingStroke>()
        for (const s of incoming) map.set(s.id, s)
        for (const s of strokes.value) map.set(s.id, s)
        strokes.value = [...map.values()]
        dirty = true
      } else {
        strokes.value = incoming
      }
    } catch (error) {
      console.error('Failed to load article drawing:', error)
      if (strokes.value.length === 0) {
        strokes.value = []
      }
    } finally {
      isLoaded.value = true
      if (dirty) {
        void persist()
      }
    }
  }

  async function persist() {
    if (!isLoaded.value && strokes.value.length === 0) return

    dirty = true

    const run = async () => {
      while (dirty) {
        dirty = false
        const snapshot = strokes.value
        try {
          await saveArticleDrawing(articleId, snapshot)
          isLoaded.value = true
        } catch (error) {
          dirty = true
          console.error('Failed to save article drawing:', error)
          break
        }
        // 保存期间若又有新笔画，dirty 会被置回 true，继续写
      }
    }

    saving = (saving ?? Promise.resolve()).then(run, run)
    await saving
  }

  function addStroke(stroke: DrawingStroke) {
    strokes.value = [...strokes.value, stroke]
    dirty = true
    void persist()
  }

  function removeStroke(id: string) {
    const next = strokes.value.filter(s => s.id !== id)
    if (next.length === strokes.value.length) return
    strokes.value = next
    dirty = true
    void persist()
  }

  function replaceStrokes(next: DrawingStroke[]) {
    strokes.value = next
    dirty = true
    void persist()
  }

  async function flushSave() {
    if (saving) await saving
    if (!dirty && isLoaded.value) return
    if (!isLoaded.value && strokes.value.length === 0) return
    await persist()
  }

  onUnmounted(() => {
    void flushSave()
  })

  return {
    strokes,
    isLoaded,
    load,
    addStroke,
    removeStroke,
    replaceStrokes,
    flushSave
  }
}
