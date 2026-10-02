/**
 * PWA 更新：桌面安装版很难靠「下拉刷新」换新包，
 * 必须主动让 Service Worker 查新版本并跳过等待。
 */
import { registerSW } from 'virtual:pwa-register'

type UpdateListener = (hasUpdate: boolean) => void

const listeners = new Set<UpdateListener>()
let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined
let registration: ServiceWorkerRegistration | undefined
let hasPendingUpdate = false
let started = false

function notify(hasUpdate: boolean) {
  hasPendingUpdate = hasUpdate
  listeners.forEach((fn) => {
    try {
      fn(hasUpdate)
    } catch (error) {
      console.warn('[pwa-update] listener failed:', error)
    }
  })
}

async function pokeRegistrationUpdate() {
  try {
    await registration?.update()
  } catch (error) {
    console.warn('[pwa-update] registration.update failed:', error)
  }
}

function watchForWaitingWorker(reg: ServiceWorkerRegistration) {
  if (reg.waiting) {
    notify(true)
  }

  reg.addEventListener('updatefound', () => {
    const installing = reg.installing
    if (!installing) return
    installing.addEventListener('statechange', () => {
      if (installing.state === 'installed' && navigator.serviceWorker.controller) {
        notify(true)
      }
    })
  })
}

/** 应用启动时调用一次 */
export function initPwaUpdate() {
  if (started || typeof window === 'undefined') return
  started = true

  updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      // prompt 模式会进这里；autoUpdate 时也可能在等待态触发
      notify(true)
    },
    onOfflineReady() {
      // 首次可离线，静默即可
    },
    onRegisteredSW(_url, reg) {
      if (!reg) return
      registration = reg
      watchForWaitingWorker(reg)

      const check = () => {
        void pokeRegistrationUpdate()
      }

      // 回到前台时查一次（手机从后台切回很常见）
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
      })
      window.addEventListener('focus', check)

      // 装到桌面后页面可能一直开着，定时探活
      window.setInterval(check, 15 * 60 * 1000)
      window.setTimeout(check, 3_000)
    },
    onRegisterError(error) {
      console.warn('[pwa-update] register failed:', error)
    },
  })
}

export function onPwaUpdateAvailable(listener: UpdateListener): () => void {
  listeners.add(listener)
  listener(hasPendingUpdate)
  return () => listeners.delete(listener)
}

export function isPwaUpdatePending() {
  return hasPendingUpdate
}

/**
 * 立即启用已下载的新版本并刷新页面。
 * reloadPage=true 时会 reload。
 */
export async function applyPwaUpdate(reloadPage = true): Promise<void> {
  try {
    if (updateSW) {
      await updateSW(reloadPage)
      return
    }

    const reg = registration || (await navigator.serviceWorker?.getRegistration())
    if (reg?.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' })
    }
  } catch (error) {
    console.warn('[pwa-update] apply failed:', error)
  }

  if (reloadPage) {
    window.location.reload()
  }
}

export type PwaCheckResult = 'updated' | 'ready' | 'latest' | 'unavailable' | 'error'

/**
 * 手动「检查更新」：
 * - ready：已有新版本在等待，可一键应用
 * - updated：已触发应用（通常会马上刷新）
 * - latest：已是最新
 */
export async function checkPwaUpdate(): Promise<PwaCheckResult> {
  if (!('serviceWorker' in navigator)) return 'unavailable'

  try {
    const reg =
      registration || (await navigator.serviceWorker.getRegistration())
    if (!reg) return 'unavailable'

    registration = reg
    await reg.update()

    if (reg.waiting) {
      notify(true)
      return 'ready'
    }

    // updatefound 可能还在装，稍等一下
    await new Promise((r) => window.setTimeout(r, 800))
    if (reg.waiting) {
      notify(true)
      return 'ready'
    }

    return 'latest'
  } catch (error) {
    console.warn('[pwa-update] check failed:', error)
    return 'error'
  }
}

/** 清空 Cache Storage（不删 IndexedDB 学习数据），再硬刷新 */
export async function clearPwaCachesAndReload(): Promise<void> {
  try {
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map((key) => caches.delete(key)))
    }
    const regs = await navigator.serviceWorker?.getRegistrations()
    if (regs) {
      await Promise.all(regs.map((r) => r.unregister()))
    }
  } catch (error) {
    console.warn('[pwa-update] clear caches failed:', error)
  }
  window.location.reload()
}
