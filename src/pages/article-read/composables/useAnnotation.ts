import { ref, computed } from 'vue'
import type { Annotation, AnnotationState } from '../types/annotation'

/**
 * 批注功能的 Composable
 * TODO: 完整实现批注的增删改查、定位、高亮等功能
 */

export function useAnnotation(articleId: string) {
  // 状态管理
  const state = ref<AnnotationState>({
    isAnnotationMode: false,
    activeAnnotationId: null,
    annotations: []
  })

  // TODO: 从数据库加载已有批注
  async function loadAnnotations() {
    console.log('TODO: 加载文章批注', articleId)
    // const annotations = await getAnnotationsByArticleId(articleId)
    // state.value.annotations = annotations
  }

  // TODO: 创建新批注
  async function createAnnotation(annotation: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>) {
    console.log('TODO: 创建批注', annotation)
    // const newAnnotation: Annotation = {
    //   ...annotation,
    //   id: `annotation-${Date.now()}`,
    //   createdAt: Date.now(),
    //   updatedAt: Date.now()
    // }
    // await saveAnnotation(newAnnotation)
    // state.value.annotations.push(newAnnotation)
    // return newAnnotation
  }

  // TODO: 更新批注
  async function updateAnnotation(id: string, updates: Partial<Annotation>) {
    console.log('TODO: 更新批注', id, updates)
    // const annotation = state.value.annotations.find(a => a.id === id)
    // if (annotation) {
    //   Object.assign(annotation, updates, { updatedAt: Date.now() })
    //   await saveAnnotation(annotation)
    // }
  }

  // TODO: 删除批注
  async function deleteAnnotation(id: string) {
    console.log('TODO: 删除批注', id)
    // await removeAnnotation(id)
    // state.value.annotations = state.value.annotations.filter(a => a.id !== id)
  }

  // TODO: 切换批注模式
  function toggleAnnotationMode() {
    state.value.isAnnotationMode = !state.value.isAnnotationMode
    console.log('批注模式:', state.value.isAnnotationMode ? '开启' : '关闭')
    
    // TODO: 批注模式下的交互逻辑
    // - 监听文本选择事件
    // - 显示批注工具栏
    // - 高亮已有批注
  }

  // TODO: 选中文本后创建批注
  function handleTextSelection(selection: Selection) {
    console.log('TODO: 处理文本选择', selection)
    // 获取选中的范围
    // 计算锚点位置
    // 显示批注创建面板
  }

  // TODO: 应用批注高亮到 DOM
  function applyAnnotationHighlights() {
    console.log('TODO: 应用批注高亮')
    // 遍历所有批注
    // 根据锚点定位到对应的 DOM 节点
    // 添加高亮样式
  }

  // TODO: 导出批注数据
  function exportAnnotations() {
    console.log('TODO: 导出批注为 JSON/Markdown')
    return state.value.annotations
  }

  // 计算属性
  const annotationCount = computed(() => state.value.annotations.length)
  const isAnnotationMode = computed(() => state.value.isAnnotationMode)

  return {
    state,
    annotationCount,
    isAnnotationMode,
    loadAnnotations,
    createAnnotation,
    updateAnnotation,
    deleteAnnotation,
    toggleAnnotationMode,
    handleTextSelection,
    applyAnnotationHighlights,
    exportAnnotations
  }
}
