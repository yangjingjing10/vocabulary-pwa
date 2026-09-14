import { getCurrentFontConfig, type FontConfig } from '@/db/repositories/font.repository'
import {
  DEFAULT_FONT_COLOR,
  DEFAULT_FONT_SIZE,
  MAX_FONT_SIZE,
  MIN_FONT_SIZE,
} from '@/pages/profile/css/font/types/font'

const STYLE_ELEMENT_ID = 'app-custom-font-face'
const FONT_SIZE_STORAGE_KEY = 'app_font_size'

/** 根据来源推断 @font-face format */
function resolveFontFormat(sourceUrl: string): string {
  const lower = sourceUrl.toLowerCase()
  if (lower.includes('.woff2') || lower.includes('woff2')) return 'woff2'
  if (lower.includes('.woff') || lower.includes('woff')) return 'woff'
  if (lower.includes('.otf') || lower.includes('opentype')) return 'opentype'
  if (lower.includes('.ttf') || lower.includes('truetype')) return 'truetype'
  return 'truetype'
}

function clampFontSize(size: number): number {
  if (!Number.isFinite(size)) return DEFAULT_FONT_SIZE
  return Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, Math.round(size)))
}

function readStoredFontSize(): number | null {
  try {
    const raw = localStorage.getItem(FONT_SIZE_STORAGE_KEY)
    if (!raw) return null
    return clampFontSize(Number(raw))
  } catch {
    return null
  }
}

function writeStoredFontSize(size: number) {
  try {
    localStorage.setItem(FONT_SIZE_STORAGE_KEY, String(size))
  } catch {
    // ignore
  }
}

function clearStoredFontSize() {
  try {
    localStorage.removeItem(FONT_SIZE_STORAGE_KEY)
  } catch {
    // ignore
  }
}

class FontService {
  private currentConfig: FontConfig | null = null

  /** 启动时恢复上次启用的字体配置 / 字号 */
  async init() {
    try {
      const config = await getCurrentFontConfig()
      if (config) {
        await this.applyFontConfig(config)
        return
      }

      const storedSize = readStoredFontSize()
      if (storedSize != null) {
        this.applyFontSize(storedSize)
      }
    } catch (error) {
      console.error('[FontService] init failed:', error)
    }
  }

  /**
   * 注入 @font-face，字体系列 / 颜色 / 字号全局生效
   */
  async applyFontConfig(config: FontConfig): Promise<boolean> {
    const src = config.source === 'file' ? config.fileData : config.url
    if (!src) {
      console.warn('[FontService] missing font source')
      return false
    }

    try {
      await this.injectFontFace(config.fontFamily, src)
      this.applyRootStyles(config)
      this.currentConfig = config
      return true
    } catch (error) {
      console.error('[FontService] apply failed:', error)
      return false
    }
  }

  /**
   * 更新全局字体颜色 / 字号（含顶栏 / 底栏）
   */
  applyTypography(options?: { color?: string; fontSize?: number }) {
    const root = document.documentElement
    if (options?.color != null) {
      this.applyFontColor(options.color)
    }
    if (options?.fontSize != null) {
      this.applyFontSize(options.fontSize)
    }
    root.classList.add('app-chrome-font-custom')
  }

  /** 全局字号：写入 CSS 变量并作为 html rem 根字号 */
  applyFontSize(size: number) {
    const next = clampFontSize(size)
    const root = document.documentElement
    root.style.setProperty('--app-font-size', `${next}px`)
    root.style.fontSize = `${next}px`
    writeStoredFontSize(next)
  }

  /** 同步写入全局正文色与 chrome 色 */
  private applyFontColor(color: string) {
    const root = document.documentElement
    root.style.setProperty('--app-font-color', color)
    root.style.setProperty('--app-chrome-font-color', color)
  }

  /** 仅切换字体系列（上传 / 链接后即时全局生效） */
  async applyFontFamily(
    fontFamily: string,
    src: string
  ): Promise<boolean> {
    try {
      await this.injectFontFace(fontFamily, src)
      document.documentElement.style.setProperty(
        '--app-font-family',
        `"${fontFamily}", sans-serif`
      )
      document.documentElement.style.fontFamily = `"${fontFamily}", sans-serif`
      return true
    } catch (error) {
      console.error('[FontService] font family apply failed:', error)
      return false
    }
  }

  clearFont() {
    this.currentConfig = null
    const styleEl = document.getElementById(STYLE_ELEMENT_ID)
    styleEl?.remove()

    const root = document.documentElement
    root.classList.remove('app-chrome-font-custom')
    root.style.removeProperty('--app-font-family')
    root.style.removeProperty('--app-chrome-font-size')
    root.style.removeProperty('--app-chrome-font-color')
    root.style.removeProperty('--app-font-size')
    root.style.removeProperty('--app-font-color')
    root.style.removeProperty('font-family')
    root.style.removeProperty('font-size')
    root.style.removeProperty('color')
    clearStoredFontSize()
  }

  getCurrentConfig() {
    return this.currentConfig
  }

  private applyRootStyles(config: FontConfig) {
    const root = document.documentElement
    const color = config.color ?? DEFAULT_FONT_COLOR
    const fontSize = clampFontSize(
      config.fontSize ?? readStoredFontSize() ?? DEFAULT_FONT_SIZE,
    )

    root.style.setProperty('--app-font-family', `"${config.fontFamily}", sans-serif`)
    this.applyFontColor(color)
    this.applyFontSize(fontSize)
    root.style.fontFamily = `"${config.fontFamily}", sans-serif`
    root.classList.add('app-chrome-font-custom')
    root.style.removeProperty('color')
  }

  /** 动态注入 @font-face，并用 FontFace API 预加载校验 */
  private async injectFontFace(fontFamily: string, src: string): Promise<void> {
    const format = resolveFontFormat(src)
    const css = `
@font-face {
  font-family: '${fontFamily}';
  src: url('${src}') format('${format}');
  font-display: swap;
}
`.trim()

    let styleEl = document.getElementById(STYLE_ELEMENT_ID) as HTMLStyleElement | null
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = STYLE_ELEMENT_ID
      document.head.appendChild(styleEl)
    }
    styleEl.textContent = css

    if (typeof FontFace !== 'undefined') {
      const face = new FontFace(fontFamily, `url(${src})`)
      await face.load()
      document.fonts.add(face)
    }
  }
}

export const fontService = new FontService()
