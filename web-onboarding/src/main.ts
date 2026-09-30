import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { applyDeviceLangIfUnset } from './lib/i18n'

applyDeviceLangIfUnset() // первый заход: язык по устройству (BACKLOG 13)

createApp(App).mount('#app')
