import type { DrawingPoint, DrawingStroke } from '../types/drawing'

function dist(a: DrawingPoint, b: DrawingPoint): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.hypot(dx, dy)
}

/** 点到线段的最短距离（归一化坐标空间） */
function distanceToSegment(p: DrawingPoint, a: DrawingPoint, b: DrawingPoint): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  if (dx === 0 && dy === 0) return dist(p, a)

  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)))
  return dist(p, { x: a.x + t * dx, y: a.y + t * dy })
}

/**
 * 命中检测：返回与点相交的笔画 id（最近优先）
 * threshold 为归一化半径（相对内容宽高的近似值，调用方按画布尺寸换算）
 */
export function findHitStrokeId(
  strokes: DrawingStroke[],
  point: DrawingPoint,
  threshold: number
): string | null {
  let bestId: string | null = null
  let bestDist = threshold

  for (let i = strokes.length - 1; i >= 0; i--) {
    const stroke = strokes[i]
    const pts = stroke.points
    if (pts.length === 0) continue

    if (pts.length === 1) {
      const d = dist(point, pts[0])
      if (d < bestDist) {
        bestDist = d
        bestId = stroke.id
      }
      continue
    }

    for (let j = 0; j < pts.length - 1; j++) {
      const d = distanceToSegment(point, pts[j], pts[j + 1])
      if (d < bestDist) {
        bestDist = d
        bestId = stroke.id
      }
    }
  }

  return bestId
}
