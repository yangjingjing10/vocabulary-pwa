export type DrawingTool = 'pen' | 'eraser' | 'pan'

export interface DrawingPoint {
  x: number
  y: number
}

export interface DrawingStroke {
  id: string
  /** 锚定到段落，折叠其它段落时不会整体拉伸偏移 */
  paragraphIndex: number
  color: string
  width: number
  points: DrawingPoint[]
  createdAt: number
}

export interface DrawingSessionState {
  isActive: boolean
  tool: DrawingTool
  color: string
  width: number
}

export const DRAWING_COLORS = [
  '#ef4444',
  '#f59e0b',
  '#22c55e',
  '#3b82f6',
  '#8b5cf6',
  '#0f172a'
] as const

export const DRAWING_WIDTHS = [2, 4, 8, 12] as const

export const DEFAULT_DRAWING_COLOR = DRAWING_COLORS[0]
export const DEFAULT_DRAWING_WIDTH = DRAWING_WIDTHS[1]
