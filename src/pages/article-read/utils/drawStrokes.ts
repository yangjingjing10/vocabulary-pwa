import type { DrawingStroke } from '../types/drawing'

/** 将笔画绘制到 canvas（坐标为归一化 0~1） */
export function paintStrokes(
  ctx: CanvasRenderingContext2D,
  strokes: DrawingStroke[],
  width: number,
  height: number
): void {
  ctx.clearRect(0, 0, width, height)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  for (const stroke of strokes) {
    if (stroke.points.length === 0) continue

    ctx.beginPath()
    ctx.strokeStyle = stroke.color
    ctx.lineWidth = stroke.width

    const first = stroke.points[0]
    ctx.moveTo(first.x * width, first.y * height)

    for (let i = 1; i < stroke.points.length; i++) {
      const p = stroke.points[i]
      ctx.lineTo(p.x * width, p.y * height)
    }

    if (stroke.points.length === 1) {
      ctx.lineTo(first.x * width + 0.01, first.y * height)
    }

    ctx.stroke()
  }
}
