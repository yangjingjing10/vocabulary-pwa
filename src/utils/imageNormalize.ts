/**
 * 将任意浏览器可解码的图片规范为 JPEG Data URL，
 * 并限制最长边，避免手机原图撑爆 IndexedDB / 背景绘制。
 */

const MAX_EDGE = 1920
const JPEG_QUALITY = 0.82
const MAX_OUTPUT_BYTES = 2.5 * 1024 * 1024

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|bmp|svg|heic|heif|avif|tiff?)$/i

export function looksLikeImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true
  // 部分手机相册会给空 MIME，靠扩展名兜底
  if (!file.type && IMAGE_EXT.test(file.name)) return true
  return false
}

function loadImageFromUrl(url: string, withCors = false): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    if (withCors) {
      img.crossOrigin = 'anonymous'
    }
    img.decoding = 'async'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('图片无法解码，请换 JPG/PNG/WebP 再试'))
    img.src = url
  })
}

function canvasToJpegDataUrl(
  source: CanvasImageSource,
  width: number,
  height: number,
  quality: number,
): string {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('当前设备不支持图片处理')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(source, 0, 0, width, height)
  return canvas.toDataURL('image/jpeg', quality)
}

function fitSize(width: number, height: number, maxEdge: number) {
  const longest = Math.max(width, height)
  if (longest <= maxEdge) {
    return { width: Math.max(1, Math.round(width)), height: Math.max(1, Math.round(height)) }
  }
  const scale = maxEdge / longest
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

/** 从远程/本地 URL 加载并规范为 JPEG Data URL */
export async function normalizeImageFromUrl(url: string): Promise<string> {
  const needsCors = /^https?:\/\//i.test(url)
  const img = await loadImageFromUrl(url, needsCors)
  const size = fitSize(img.naturalWidth || img.width, img.naturalHeight || img.height, MAX_EDGE)

  let quality = JPEG_QUALITY
  let dataUrl = canvasToJpegDataUrl(img, size.width, size.height, quality)

  // 过大则继续压质量
  while (dataUrl.length > MAX_OUTPUT_BYTES * 1.37 && quality > 0.45) {
    quality -= 0.1
    dataUrl = canvasToJpegDataUrl(img, size.width, size.height, quality)
  }

  return dataUrl
}

/** 从 File 规范为 JPEG Data URL（尽量兼容任意图片） */
export async function normalizeImageFromFile(file: File): Promise<string> {
  if (!looksLikeImageFile(file)) {
    throw new Error('请选择图片文件')
  }

  // 先尝试 createImageBitmap（对部分格式更稳）
  try {
    if (typeof createImageBitmap === 'function') {
      const bitmap = await createImageBitmap(file)
      const size = fitSize(bitmap.width, bitmap.height, MAX_EDGE)
      let quality = JPEG_QUALITY
      let dataUrl = canvasToJpegDataUrl(bitmap, size.width, size.height, quality)
      while (dataUrl.length > MAX_OUTPUT_BYTES * 1.37 && quality > 0.45) {
        quality -= 0.1
        dataUrl = canvasToJpegDataUrl(bitmap, size.width, size.height, quality)
      }
      bitmap.close?.()
      return dataUrl
    }
  } catch {
    // fallback below
  }

  const objectUrl = URL.createObjectURL(file)
  try {
    return await normalizeImageFromUrl(objectUrl)
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export function guessNameFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname
    const base = pathname.split('/').pop() || 'wallpaper'
    return decodeURIComponent(base.replace(/\.[^/.]+$/, '') || 'wallpaper')
  } catch {
    return 'wallpaper'
  }
}
