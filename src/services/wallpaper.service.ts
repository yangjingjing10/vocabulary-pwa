import {
  getAllWallpapers,
  getCurrentWallpaper,
  getRotationSettings,
  saveRotationSettings,
  setCurrentWallpaper,
  type Wallpaper,
  type WallpaperRotationSettings
} from '@/db/repositories/wallpaper.repository'

type WallpaperChangeListener = (wallpaper: Wallpaper | null) => void
type RotationSettingsListener = (settings: WallpaperRotationSettings) => void

class WallpaperService {
  private currentWallpaper: Wallpaper | null = null
  private rotationTimer: ReturnType<typeof setInterval> | null = null
  private rotationSettings: WallpaperRotationSettings = {
    enabled: false,
    intervalMinutes: 5
  }
  private wallpaperListeners = new Set<WallpaperChangeListener>()
  private rotationListeners = new Set<RotationSettingsListener>()

  async init() {
    const wallpaper = await getCurrentWallpaper()
    if (wallpaper) {
      this.applyWallpaper(wallpaper)
    }

    this.rotationSettings = await getRotationSettings()
    this.notifyRotationListeners()
    await this.syncRotationTimer()
  }

  applyWallpaper(wallpaper: Wallpaper) {
    this.currentWallpaper = wallpaper
    const root = document.documentElement
    
    root.style.setProperty('--wallpaper-bg', `url(${wallpaper.imageData})`)
    
    const blur = wallpaper.blur ?? 0
    if (blur > 0) {
      root.style.setProperty('--wallpaper-blur', `blur(${blur}px)`)
    } else {
      root.style.setProperty('--wallpaper-blur', 'none')
    }
    
    const opacity = (wallpaper.opacity ?? 85) / 100
    root.style.setProperty('--wallpaper-overlay', `rgba(255, 255, 255, ${1 - opacity})`)
    this.notifyWallpaperListeners(wallpaper)
  }

  clearWallpaper() {
    this.currentWallpaper = null
    const root = document.documentElement
    root.style.setProperty('--wallpaper-bg', 'none')
    root.style.setProperty('--wallpaper-blur', 'none')
    root.style.setProperty('--wallpaper-overlay', 'transparent')
    this.notifyWallpaperListeners(null)
  }

  getCurrentWallpaper() {
    return this.currentWallpaper
  }

  getRotationSettings(): WallpaperRotationSettings {
    return { ...this.rotationSettings }
  }

  async setRotationEnabled(enabled: boolean) {
    return this.updateRotationSettings({ enabled })
  }

  async setRotationInterval(intervalMinutes: number) {
    return this.updateRotationSettings({ intervalMinutes })
  }

  async updateRotationSettings(partial: Partial<WallpaperRotationSettings>) {
    const next: WallpaperRotationSettings = {
      ...this.rotationSettings,
      ...partial
    }
    this.rotationSettings = await saveRotationSettings(next)
    this.notifyRotationListeners()
    await this.syncRotationTimer()
    return this.getRotationSettings()
  }

  /** 壁纸列表变化后调用，不足 2 张时自动停表 */
  async refreshRotation() {
    await this.syncRotationTimer()
  }

  onWallpaperChange(listener: WallpaperChangeListener) {
    this.wallpaperListeners.add(listener)
    return () => this.wallpaperListeners.delete(listener)
  }

  onRotationSettingsChange(listener: RotationSettingsListener) {
    this.rotationListeners.add(listener)
    return () => this.rotationListeners.delete(listener)
  }

  private notifyWallpaperListeners(wallpaper: Wallpaper | null) {
    this.wallpaperListeners.forEach(listener => listener(wallpaper))
  }

  private notifyRotationListeners() {
    const snapshot = this.getRotationSettings()
    this.rotationListeners.forEach(listener => listener(snapshot))
  }

  private async syncRotationTimer() {
    this.clearRotationTimer()

    if (!this.rotationSettings.enabled) return

    const wallpapers = await getAllWallpapers()
    if (wallpapers.length < 2) return

    const intervalMs = this.rotationSettings.intervalMinutes * 60 * 1000
    this.rotationTimer = setInterval(() => {
      void this.rotateToNext()
    }, intervalMs)
  }

  private clearRotationTimer() {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer)
      this.rotationTimer = null
    }
  }

  private async rotateToNext() {
    if (!this.rotationSettings.enabled) return

    const wallpapers = await getAllWallpapers()
    if (wallpapers.length < 2) {
      this.clearRotationTimer()
      return
    }

    // 按创建时间排序，保证轮换顺序稳定
    const sorted = [...wallpapers].sort((a, b) => a.createdAt - b.createdAt)
    const currentId = this.currentWallpaper?.id
    const currentIndex = currentId
      ? sorted.findIndex(w => w.id === currentId)
      : -1
    const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % sorted.length
    const next = sorted[nextIndex]
    if (!next) return

    await setCurrentWallpaper(next.id)
    this.applyWallpaper(next)
  }
}

export const wallpaperService = new WallpaperService()
