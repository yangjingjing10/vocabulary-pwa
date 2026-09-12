import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg'],
      manifest: {
        name: 'Vocabulary PWA',
        short_name: 'Vocabulary',
        description: '离线优先的 PWA 应用',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icons/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.html',
        // 词库约 4MB，不走 SW 预缓存；首次 fetch 后写入 IndexedDB
        globIgnores: ['**/dict/**'],
      }
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
    // 同名 .js 残留会盖住 .ts（曾导致 getPendingWords is not a function）
    extensions: ['.mjs', '.mts', '.ts', '.tsx', '.jsx', '.js', '.json', '.vue'],
  }
})
