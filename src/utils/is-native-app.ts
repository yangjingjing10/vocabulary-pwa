/** Capacitor 原生壳（Android/iOS）内为 true；纯浏览器 / PWA 为 false */
export function isNativeApp(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!(window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
      ?.isNativePlatform?.()
  )
}
