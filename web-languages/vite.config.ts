import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Пилотная страница на Vue 3 + TS + Tailwind — перенос english.js/html. Папка и адрес
// сборки уже называются "languages" (не "english"), хотя ванильная страница пока
// называется english.js/html — таково пожелание пользователя на будущее ("в итоге
// переименовать в Languages"); сам ванильный файл пока не переименован, это отдельная
// более рискованная задача (живые URL, закладки). Собирается в ../languages.
export default defineConfig({
  base: '/languages/',
  plugins: [vue(), tailwindcss()],
  build: {
    outDir: '../languages',
    emptyOutDir: true,
  },
})
