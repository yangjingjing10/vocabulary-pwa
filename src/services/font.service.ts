import { getCurrentFontConfig, type FontConfig } from '@/db/repositories/font.repository'
import { DEFAULT_FONT_COLOR } from '@/pages/profile/css/font/types/font'

const STYLE_ELEMENT_ID = 'app-custom-font-face'

/** 根据来源推断 @font-face format */
function resolveFontFormat(sourceUrl: string): string {
  const lower = sourceUrl.toLowerCase()
  if (lower.includes('.woff2') || lower.includes('woff2')) return 'woff2'
  if (lower.includes('.woff') || lower.includes('woff')) return 'woff'
  if (lower.includes('.otf') || lower.includes('opentype')) return 'opentype'
  if (lower.includes('.ttf') || lower.includes('truetype')) return 'truetype'
  return 'truetype'
}

class FontService {
  private currentConfig: FontConfig | null = null

  /** 启动时恢复上次启用的字体配置 */
  async init() {
    try {
      const config = await getCurrentFontConfig()
      if (config) {
        await this.applyFontConfig(config)
      }
    } catch (error) {
      console.error('[FontService] init failed:', error)
    }
  }

  /**
   * 注入 @font-face，字体系列全局生效；
   * 颜色作用于全局正文与顶栏 / 底栏；字号跟随系统设置
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
   * 更新全局字体颜色（含顶栏 / 底栏；不改字号，跟随系统）
   */
  applyTypography(color?: string) {
    const root = document.documentElement
    if (color != null) {
      this.applyFontColor(color)
    }
    root.classList.add('app-chrome-font-custom')
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
    // 兼容清理旧版误写到根节点的样式
    root.style.removeProperty('--app-font-size')
    root.style.removeProperty('--app-font-color')
    root.style.removeProperty('font-family')
    root.style.removeProperty('font-size')
    root.style.removeProperty('color')
  }

  getCurrentConfig() {
    return this.currentConfig
  }

  private applyRootStyles(config: FontConfig) {
    const root = document.documentElement
    const color = config.color ?? DEFAULT_FONT_COLOR

    root.style.setProperty('--app-font-family', `"${config.fontFamily}", sans-serif`)
    this.applyFontColor(color)
    root.style.fontFamily = `"${config.fontFamily}", sans-serif`
    root.classList.add('app-chrome-font-custom')

    // 字号跟随系统：清除旧版自定义字号 / 误写到根节点的 color
    root.style.removeProperty('--app-chrome-font-size')
    root.style.removeProperty('font-size')
    root.style.removeProperty('color')
    root.style.removeProperty('--app-font-size')
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
