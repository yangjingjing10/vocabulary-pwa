import { createApp } from 'vue'

import App from './App.vue'
import './styles/index.css'
import { wallpaperService } from './services/wallpaper.service'
import { fontService } from './services/font.service'

wallpaperService.init()
fontService.init()

createApp(App).mount('#app')
