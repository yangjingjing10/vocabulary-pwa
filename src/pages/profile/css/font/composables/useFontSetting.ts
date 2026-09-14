import { computed, onMounted, ref } from 'vue'

import {
  addFontAsset,
  addFontConfig,
  clearCurrentFontConfig,
  deleteFontConfig,
  getAllFontAssets,
  getAllFontConfigs,
  saveFontConfig,
  setCurrentFontConfig,
  type FontAsset,
  type FontConfig
} from '@/db/repositories/font.repository'
import { fontService } from '@/services/font.service'
import {
  DEFAULT_FONT_COLOR,
  DEFAULT_FONT_SIZE,
  MAX_FONT_SIZE,
  MIN_FONT_SIZE,
  type FontDraft,
  type FontSource
} from '../types/font'

const ALLOWED_EXTENSIONS = ['.ttf', '.otf', '.woff', '.woff2']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

function clampFontSize(size: number): number {
  if (!Number.isFinite(size)) return DEFAULT_FONT_SIZE
  return Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, Math.round(size)))
}

function createDefaultDraft(): FontDraft {
  return {
    source: null,
    fontFamily: '',
    color: DEFAULT_FONT_COLOR,
    fontSize: readInitialFontSize(),
  }
}

function readInitialFontSize(): number {
  try {
    const raw = localStorage.getItem('app_font_size')
    if (raw != null) return clampFontSize(Number(raw))
  } catch {
    // ignore
  }
  return DEFAULT_FONT_SIZE
}

function sanitizeFontFamily(name: string): string {
  return name.replace(/[^\w\u4e00-\u9fff-]/g, '-').replace(/-+/g, '-') || `CustomFont-${Date.now()}`
}

function draftToFontSrc(draft: FontDraft): string | null {
  if (draft.source === 'file') return draft.fileData || null
  if (draft.source === 'url') return draft.url || null
  return null
}

export function useFontSetting() {
  const configs = ref<FontConfig[]>([])
  const fontAssets = ref<FontAsset[]>([])
  const activeConfigId = ref<string | null>(null)
  /** 当前正在编辑（可更新）的配置 id */
  const editingConfigId = ref<string | null>(null)
  const editingConfigName = ref('')
  const draft = ref<FontDraft>(createDefaultDraft())
  const loading = ref(false)
  const errorMessage = ref('')
  const successMessage = ref('')

  const activeConfig = computed(() => {
    if (!activeConfigId.value) return null
    return configs.value.find((c) => c.id === activeConfigId.value) || null
  })

  const isEditingExisting = computed(() => Boolean(editingConfigId.value))

  const canSave = computed(() => Boolean(draft.value.source && draft.value.fontFamily))

  function showError(message: string) {
    errorMessage.value = message
    successMessage.value = ''
    window.setTimeout(() => {
      if (errorMessage.value === message) errorMessage.value = ''
    }, 3000)
  }

  function showSuccess(message: string) {
    successMessage.value = message
    errorMessage.value = ''
    window.setTimeout(() => {
      if (successMessage.value === message) successMessage.value = ''
    }, 2500)
  }

  async function loadConfigs() {
    try {
      configs.value = await getAllFontConfigs()
      fontAssets.value = await getAllFontAssets()

      // 兼容旧数据：把历史配置里的字体同步进资源库，方便下拉选择
      await syncAssetsFromConfigs()

      const selected = configs.value.find((c) => c.isSelected)
      activeConfigId.value = selected?.id ?? null

      if (selected) {
        editingConfigId.value = selected.id
        editingConfigName.value = selected.name
        draft.value = {
          source: selected.source,
          fontFamily: selected.fontFamily,
          fontAssetId: selected.fontAssetId,
          fileData: selected.fileData,
          url: selected.url,
          color: selected.color ?? DEFAULT_FONT_COLOR,
          fontSize: clampFontSize(selected.fontSize ?? DEFAULT_FONT_SIZE),
        }
      }
    } catch (error) {
      console.error('[useFontSetting] load failed:', error)
      showError('加载字体配置失败')
    }
  }

  /** 将配置中的字体补录到 fontAssets（不重复） */
  async function syncAssetsFromConfigs() {
    let changed = false
    for (const config of configs.value) {
      if (!config.fontFamily) continue
      const srcOk =
        (config.source === 'file' && config.fileData) ||
        (config.source === 'url' && config.url)
      if (!srcOk) continue

      const existed = fontAssets.value.find(
        (a) =>
          a.fontFamily === config.fontFamily &&
          a.source === config.source &&
          ((config.source === 'file' && a.fileData === config.fileData) ||
            (config.source === 'url' && a.url === config.url))
      )
      if (existed) {
        if (!config.fontAssetId) {
          config.fontAssetId = existed.id
          await saveFontConfig(config)
        }
        continue
      }

      const asset: FontAsset = {
        id: `asset-sync-${config.id}`,
        name: config.name || config.fontFamily,
        source: config.source,
        fontFamily: config.fontFamily,
        fileData: config.fileData,
        url: config.url,
        createdAt: config.createdAt || Date.now()
      }
      await addFontAsset(asset)
      config.fontAssetId = asset.id
      await saveFontConfig(config)
      changed = true
    }
    if (changed) {
      fontAssets.value = await getAllFontAssets()
    }
  }

  /** 把草稿里的字体写入资源库（供下拉复用） */
  async function persistFontAsset(params: {
    name: string
    source: FontSource
    fontFamily: string
    fileData?: string
    url?: string
  }): Promise<FontAsset> {
    // 同 fontFamily + source 去重，避免重复入库
    const existed = fontAssets.value.find(
      (a) =>
        a.fontFamily === params.fontFamily &&
        a.source === params.source &&
        ((params.source === 'file' && a.fileData === params.fileData) ||
          (params.source === 'url' && a.url === params.url))
    )
    if (existed) return existed

    const asset: FontAsset = {
      id: `asset-${Date.now()}`,
      name: params.name,
      source: params.source,
      fontFamily: params.fontFamily,
      fileData: params.fileData,
      url: params.url,
      createdAt: Date.now()
    }
    await addFontAsset(asset)
    fontAssets.value = await getAllFontAssets()
    return asset
  }

  async function applyDraftFont(): Promise<boolean> {
    const src = draftToFontSrc(draft.value)
    if (!draft.value.fontFamily || !src) return false
    const ok = await fontService.applyFontFamily(draft.value.fontFamily, src)
    if (ok) {
      fontService.applyTypography({
        color: draft.value.color,
        fontSize: draft.value.fontSize,
      })
    }
    return ok
  }

  /** 从本地文件上传：入库资源库 + 立即应用 */
  async function uploadFontFile(file: File): Promise<boolean> {
    const ext = `.${file.name.split('.').pop()?.toLowerCase() || ''}`
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      showError('请上传 .ttf / .otf / .woff / .woff2 字体文件')
      return false
    }
    if (file.size > MAX_FILE_SIZE) {
      showError('字体文件不能超过 10MB')
      return false
    }

    loading.value = true
    try {
      const fileData = await readFileAsDataUrl(file)
      const baseName = file.name.replace(/\.[^/.]+$/, '')
      const fontFamily = sanitizeFontFamily(baseName)

      const ok = await fontService.applyFontFamily(fontFamily, fileData)
      if (!ok) {
        showError('字体加载失败，请检查文件是否有效')
        return false
      }

      const asset = await persistFontAsset({
        name: baseName,
        source: 'file',
        fontFamily,
        fileData
      })

      draft.value = {
        ...draft.value,
        source: 'file',
        fontFamily,
        fontAssetId: asset.id,
        fileData,
        url: undefined
      }
      fontService.applyTypography({
        color: draft.value.color,
        fontSize: draft.value.fontSize,
      })
      showSuccess('字体已应用')
      return true
    } catch (error) {
      console.error('[useFontSetting] upload failed:', error)
      showError('上传失败，请重试')
      return false
    } finally {
      loading.value = false
    }
  }

  /** 通过 URL 加载字体：入库 + 应用 */
  async function importFontFromUrl(url: string): Promise<boolean> {
    const trimmed = url.trim()
    if (!trimmed) {
      showError('请输入字体链接')
      return false
    }
    if (!/^https?:\/\//i.test(trimmed)) {
      showError('请输入以 http(s):// 开头的有效链接')
      return false
    }

    loading.value = true
    try {
      const nameFromUrl = trimmed.split('/').pop()?.split('?')[0] || 'RemoteFont'
      const baseName = nameFromUrl.replace(/\.[^/.]+$/, '')
      const fontFamily = sanitizeFontFamily(baseName)

      const ok = await fontService.applyFontFamily(fontFamily, trimmed)
      if (!ok) {
        showError('字体链接加载失败，请检查地址或跨域限制')
        return false
      }

      const asset = await persistFontAsset({
        name: baseName,
        source: 'url',
        fontFamily,
        url: trimmed
      })

      draft.value = {
        ...draft.value,
        source: 'url',
        fontFamily,
        fontAssetId: asset.id,
        url: trimmed,
        fileData: undefined
      }
      fontService.applyTypography({
        color: draft.value.color,
        fontSize: draft.value.fontSize,
      })
      showSuccess('字体已应用')
      return true
    } catch (error) {
      console.error('[useFontSetting] url import failed:', error)
      showError('字体链接加载失败，请检查地址或跨域限制')
      return false
    } finally {
      loading.value = false
    }
  }

  /** 从下拉选择已上传字体 */
  async function selectFontAsset(assetId: string): Promise<boolean> {
    const asset = fontAssets.value.find((a) => a.id === assetId)
    if (!asset) {
      showError('字体不存在')
      return false
    }

    loading.value = true
    try {
      draft.value = {
        ...draft.value,
        source: asset.source,
        fontFamily: asset.fontFamily,
        fontAssetId: asset.id,
        fileData: asset.fileData,
        url: asset.url
      }
      const ok = await applyDraftFont()
      if (!ok) {
        showError('字体加载失败')
        return false
      }
      showSuccess(`已切换字体「${asset.name}」`)
      return true
    } catch (error) {
      console.error('[useFontSetting] select asset failed:', error)
      showError('切换字体失败')
      return false
    } finally {
      loading.value = false
    }
  }

  async function setFontColor(color: string) {
    draft.value.color = color
    fontService.applyTypography({
      color,
      fontSize: draft.value.fontSize,
    })
    await persistActiveTypography()
  }

  async function setFontSize(size: number) {
    const next = clampFontSize(size)
    draft.value.fontSize = next
    fontService.applyTypography({
      color: draft.value.color,
      fontSize: next,
    })
    await persistActiveTypography()
  }

  async function persistActiveTypography() {
    if (!editingConfigId.value) return
    const config = configs.value.find((c) => c.id === editingConfigId.value)
    if (!config) return

    config.color = draft.value.color
    config.fontSize = draft.value.fontSize
    config.updatedAt = Date.now()
    try {
      await saveFontConfig(config)
    } catch (error) {
      console.error('[useFontSetting] persist typography failed:', error)
    }
  }

  function validateDraftForSave(): boolean {
    if (!draft.value.source || !draft.value.fontFamily) {
      showError('请先上传字体、粘贴链接或从下拉选择字体')
      return false
    }
    if (draft.value.source === 'file' && !draft.value.fileData) {
      showError('本地字体数据缺失，请重新上传')
      return false
    }
    if (draft.value.source === 'url' && !draft.value.url) {
      showError('字体链接缺失，请重新导入')
      return false
    }
    return true
  }

  /** 新建配置 */
  async function saveNamedConfig(name: string): Promise<boolean> {
    const trimmed = name.trim()
    if (!trimmed) {
      showError('请输入配置名称')
      return false
    }
    if (!validateDraftForSave()) return false

    loading.value = true
    try {
      const now = Date.now()
      const config: FontConfig = {
        id: `font-${now}`,
        name: trimmed,
        source: draft.value.source as FontSource,
        fontFamily: draft.value.fontFamily,
        fontAssetId: draft.value.fontAssetId,
        fileData: draft.value.fileData,
        url: draft.value.url,
        color: draft.value.color,
        fontSize: draft.value.fontSize,
        isSelected: true,
        createdAt: now,
        updatedAt: now
      }

      await addFontConfig(config)
      await setCurrentFontConfig(config.id)
      await loadConfigs()

      editingConfigId.value = config.id
      editingConfigName.value = config.name

      const ok = await fontService.applyFontConfig(config)
      if (!ok) {
        showError('配置已保存，但字体应用失败')
        return false
      }

      showSuccess('配置已保存并启用')
      return true
    } catch (error) {
      console.error('[useFontSetting] save failed:', error)
      showError('保存失败，请重试')
      return false
    } finally {
      loading.value = false
    }
  }

  /** 更新当前选中的已有配置 */
  async function updateExistingConfig(name?: string): Promise<boolean> {
    if (!editingConfigId.value) {
      showError('请先点击下方配置再更新')
      return false
    }
    if (!validateDraftForSave()) return false

    const trimmed = (name ?? editingConfigName.value).trim()
    if (!trimmed) {
      showError('请输入配置名称')
      return false
    }

    const existing = configs.value.find((c) => c.id === editingConfigId.value)
    if (!existing) {
      showError('配置不存在')
      return false
    }

    loading.value = true
    try {
      const updated: FontConfig = {
        ...existing,
        name: trimmed,
        source: draft.value.source as FontSource,
        fontFamily: draft.value.fontFamily,
        fontAssetId: draft.value.fontAssetId,
        fileData: draft.value.fileData,
        url: draft.value.url,
        color: draft.value.color,
        fontSize: draft.value.fontSize,
        isSelected: true,
        updatedAt: Date.now()
      }

      await saveFontConfig(updated)
      await setCurrentFontConfig(updated.id)
      await loadConfigs()

      editingConfigId.value = updated.id
      editingConfigName.value = updated.name
      activeConfigId.value = updated.id

      const ok = await fontService.applyFontConfig(updated)
      if (!ok) {
        showError('配置已更新，但字体应用失败')
        return false
      }

      showSuccess('配置已更新')
      return true
    } catch (error) {
      console.error('[useFontSetting] update failed:', error)
      showError('更新失败，请重试')
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * 点击下方配置：载入草稿供编辑 / 更新，并立即应用
   */
  async function applyConfig(id: string): Promise<boolean> {
    const config = configs.value.find((c) => c.id === id)
    if (!config) {
      showError('配置不存在')
      return false
    }

    loading.value = true
    try {
      const ok = await fontService.applyFontConfig(config)
      if (!ok) {
        showError('字体加载失败，请检查配置中的字体资源')
        return false
      }

      await setCurrentFontConfig(id)
      activeConfigId.value = id
      editingConfigId.value = id
      editingConfigName.value = config.name
      configs.value.forEach((c) => {
        c.isSelected = c.id === id
      })

      draft.value = {
        source: config.source,
        fontFamily: config.fontFamily,
        fontAssetId: config.fontAssetId,
        fileData: config.fileData,
        url: config.url,
        color: config.color ?? DEFAULT_FONT_COLOR,
        fontSize: clampFontSize(config.fontSize ?? DEFAULT_FONT_SIZE),
      }

      showSuccess(`已载入「${config.name}」，可修改后点更新`)
      return true
    } catch (error) {
      console.error('[useFontSetting] apply config failed:', error)
      showError('切换配置失败')
      return false
    } finally {
      loading.value = false
    }
  }

  /**
   * 删除配置：只删配置记录，保留字体资源与当前预览/应用效果
   */
  async function removeConfig(id: string): Promise<boolean> {
    const confirmed = window.confirm('确定删除该字体配置吗？（已上传的字体仍会保留在下拉列表中）')
    if (!confirmed) return false

    try {
      const wasEditing = editingConfigId.value === id
      await deleteFontConfig(id)
      await loadConfigs()

      if (wasEditing) {
        editingConfigId.value = null
        editingConfigName.value = ''
        activeConfigId.value = null
        await clearCurrentFontConfig()
        // 不调用 clearFont()，当前字体继续生效，可另存为新配置
      }

      showSuccess('配置已删除，字体仍可继续使用')
      return true
    } catch (error) {
      console.error('[useFontSetting] delete failed:', error)
      showError('删除失败，请重试')
      return false
    }
  }

  async function resetToDefault() {
    fontService.clearFont()
    draft.value = createDefaultDraft()
    activeConfigId.value = null
    editingConfigId.value = null
    editingConfigName.value = ''
    await clearCurrentFontConfig()
    configs.value.forEach((c) => {
      c.isSelected = false
    })
    showSuccess('已恢复默认字体')
  }

  onMounted(async () => {
    await loadConfigs()
  })

  return {
    configs,
    fontAssets,
    activeConfigId,
    editingConfigId,
    editingConfigName,
    activeConfig,
    isEditingExisting,
    canSave,
    draft,
    loading,
    errorMessage,
    successMessage,
    loadConfigs,
    uploadFontFile,
    importFontFromUrl,
    selectFontAsset,
    setFontColor,
    setFontSize,
    saveNamedConfig,
    updateExistingConfig,
    applyConfig,
    removeConfig,
    resetToDefault
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error || new Error('read failed'))
    reader.readAsDataURL(file)
  })
}
