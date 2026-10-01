import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { registerServiceWorker } from './lib/registerSw'
import { applyDeviceLangIfUnset } from './lib/i18n'

applyDeviceLangIfUnset() // первый заход: язык по устройству (BACKLOG 13)

createApp(App).mount('#app')
registerServiceWorker() // /sw.js: офлайн-оболочка и «устанавливаемость» PWA (BACKLOG п.2)
