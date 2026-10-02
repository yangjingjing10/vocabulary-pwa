import { Capacitor } from '@capacitor/core'

/**
 * Android WebView 上 env(safe-area-inset-*) 经常为 0，且不能依赖
 * SystemBars 原生外边距（会在壁纸顶上垫出大白块）。
 * 仅在 Capacitor 原生端写入透明区用的 CSS 变量，壁纸仍能透出。
 */
export function initSafeArea() {
  const root = document.documentElement

  if (Capacitor.getPlatform() !== 'android') return

  // 常见状态栏高度约 24–32px；用 CSS 变量做顶栏 padding，背景保持透明
  root.style.setProperty('--app-safe-top', '28px')
  root.style.setProperty('--app-safe-bottom', '16px')
}
