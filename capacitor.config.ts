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
    // disable：避免原生给 WebView 加外边距（会在壁纸上方露出大白块）
    // 顶部避让改由前端 CSS --app-safe-top 处理
    SystemBars: {
      insetsHandling: 'disable',
      style: 'DARK',
    },
  },
}

export default config
