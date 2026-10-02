import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.vocabulary.app',
  appName: '背单词',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // 允许访问局域网 http://IP:11434（Ollama）
    cleartext: true,
  },
  android: {
    // https WebView 内请求 http Ollama
    allowMixedContent: true,
  },
  plugins: {
    // Android WebView <140 时 env(safe-area-*) 不可靠，注入 --safe-area-inset-*
    SystemBars: {
      insetsHandling: 'css',
      initialViewportFitValueHint: 'cover',
      style: 'DARK',
    },
  },
}

export default config
