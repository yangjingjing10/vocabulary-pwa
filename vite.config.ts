import { fileURLToPath, URL } from 'node:url'
import type { Plugin } from 'vite'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

/** 开发态 RSS 反代，绕过浏览器 CORS */
function rssProxyPlugin(): Plugin {
  return {
    name: 'rss-proxy',
    configureServer(server) {
      server.middlewares.use('/api/rss-proxy', async (req, res) => {
        try {
          const host = req.headers.host || 'localhost'
          const full = new URL(req.url || '', `http://${host}`)
          const target = full.searchParams.get('url')
          if (!target) {
            res.statusCode = 400
            res.end('missing url')
            return
          }
          let parsed: URL
          try {
            parsed = new URL(target)
          } catch {
            res.statusCode = 400
            res.end('invalid url')
            return
          }
          if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            res.statusCode = 400
            res.end('unsupported protocol')
            return
          }

          const upstream = await fetch(parsed.toString(), {
            headers: {
              'User-Agent': 'VocabularyPWA-RSS/1.0',
              Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
            },
          })
          const body = await upstream.text()
          res.statusCode = upstream.status
          res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/xml; charset=utf-8')
          res.setHeader('Cache-Control', 'no-store')
          res.end(body)
        } catch (error) {
          res.statusCode = 502
          res.end(error instanceof Error ? error.message : 'proxy error')
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [
    vue(),
    rssProxyPlugin(),
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
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.html',
        // 词库约 4MB，不走 SW 预缓存；首次 fetch 后写入 IndexedDB
        globIgnores: ['**/dict/**'],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    // 同名 .js 残留会盖住 .ts（曾导致 getPendingWords is not a function）
    extensions: ['.mjs', '.mts', '.ts', '.tsx', '.jsx', '.js', '.json', '.vue'],
  },
})
