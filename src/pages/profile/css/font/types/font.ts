/** 字体配置来源 */
export type FontSource = 'file' | 'url'

/** 已上传 / 导入的字体资源（与配置分离，删配置不删字体） */
export interface FontAsset {
  id: string
  /** 展示名称 */
  name: string
  source: FontSource
  fontFamily: string
  fileData?: string
  url?: string
  createdAt: number
}

/** 单套字体配置（持久化实体） */
export interface FontConfig {
  id: string
  name: string
  /** 字体来源：本地文件 / 链接 */
  source: FontSource
  /** CSS font-family 名称 */
  fontFamily: string
  /** 关联的字体资源 id（可选，便于下拉回显） */
  fontAssetId?: string
  /** 本地字体 base64 Data URL */
  fileData?: string
  /** 链接字体地址 */
  url?: string
  /** @deprecated 字号已跟随系统设置，保留字段仅兼容旧数据 */
  fontSize?: number
  /** 全局字体颜色（正文 + 顶栏 / 底栏） */
  color?: string
  /** 是否为当前启用配置 */
  isSelected?: boolean
  createdAt: number
  updatedAt: number
}

/** 字体设置运行时状态 */
export interface FontSettingState {
  configs: FontConfig[]
  activeConfigId: string | null
}

/** 编辑中的草稿（未命名保存前） */
export interface FontDraft {
  source: FontSource | null
  fontFamily: string
  fontAssetId?: string
  fileData?: string
  url?: string
  color: string
}

export const DEFAULT_FONT_COLOR = 'rgba(15, 23, 42, 1)'
