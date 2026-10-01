import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { registerServiceWorker } from './lib/registerSw'
import { applyMotion } from './lib/motion'

applyMotion() // «отключить все анимации» — до первой отрисовки Vue (index.html делает то же для статичной заставки)
createApp(App).mount('#app')
registerServiceWorker() // /sw.js: офлайн-оболочка и «устанавливаемость» PWA (BACKLOG п.2)
