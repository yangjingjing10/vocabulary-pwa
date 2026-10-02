import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.vocabulary.app',
  appName: '背单词',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
}

export default config
