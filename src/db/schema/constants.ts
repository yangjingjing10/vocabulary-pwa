export const DATABASE_NAME = 'vocabulary-pwa'
export const DATABASE_VERSION = 1

export const STORE_NAMES = {
  vocabulary: 'vocabulary'
} as const

export type StoreName = (typeof STORE_NAMES)[keyof typeof STORE_NAMES]
