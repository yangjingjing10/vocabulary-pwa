/**
 * 批注相关类型定义
 * TODO: 后续开发批注功能时完善
 */

export interface AnnotationAnchor {
  // TODO: 定位方式待定，可能需要支持多种定位策略
  paragraphIndex?: number    // 段落索引
  startOffset?: number       // 起始偏移量
  endOffset?: number         // 结束偏移量
  // TODO: 考虑支持更复杂的定位，如 XPath、CSS Selector、或自定义 Range
}

export interface Annotation {
  id: string
  articleId: string
  anchor: AnnotationAnchor   // 批注锚点位置
  content: string            // 批注内容
  color?: string             // 批注颜色（高亮色）
  type?: 'highlight' | 'note' | 'underline'  // 批注类型
  createdAt: number
  updatedAt: number
}

export interface AnnotationState {
  isAnnotationMode: boolean  // 是否处于批注模式
  activeAnnotationId: string | null  // 当前活动的批注 ID
  annotations: Annotation[]  // 当前文章的所有批注
}

// TODO: 批注操作相关类型
export interface AnnotationAction {
  type: 'create' | 'update' | 'delete'
  annotation: Annotation
}
