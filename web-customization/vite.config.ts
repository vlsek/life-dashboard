import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Страница «Кастомизация» (BACKLOG 491, фаза 3): новый раздел сразу на Vue 3 + TS + Tailwind, без классической версии.
// Собирается в ../customization — отдельную папку в корне репозитория, раздаётся Cloudflare Workers как статика.
// base совпадает с этим путём, чтобы собранные ссылки на ассеты резолвились правильно.
export default defineConfig({
  base: '/customization/',
  plugins: [vue(), tailwindcss()],
  build: {
    outDir: '../customization',
    emptyOutDir: true,
  },
})
