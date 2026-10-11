import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import BgApp from './BgApp.vue'
import { isBgMode } from './lib/bgMode'
import { registerServiceWorker } from './lib/registerSw'

// `?bg=1` внутри iframe — фоновая проверка новых достижений для шапки (BACKLOG 52.1 срез 2): без интерфейса и без сервис-воркера.
if (isBgMode()) {
  createApp(BgApp).mount('#app')
} else {
  createApp(App).mount('#app')
  registerServiceWorker() // /sw.js: офлайн-оболочка и «устанавливаемость» PWA (BACKLOG п.2)
}
