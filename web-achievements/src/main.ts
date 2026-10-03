import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { registerServiceWorker } from './lib/registerSw'

createApp(App).mount('#app')
registerServiceWorker() // /sw.js: офлайн-оболочка и «устанавливаемость» PWA (BACKLOG п.2)
