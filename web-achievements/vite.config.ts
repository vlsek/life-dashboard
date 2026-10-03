import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Страница «Достижения» (BACKLOG 19:06, фаза 3): новый раздел сразу на Vue 3 + TS + Tailwind, без классической версии.
// Собирается в ../achievements — отдельную папку в корне репозитория, раздаётся Cloudflare Workers как статика.
// base совпадает с этим путём, чтобы собранные ссылки на ассеты резолвились правильно.
export default defineConfig({
  base: '/achievements/',
  plugins: [vue(), tailwindcss()],
  build: {
    outDir: '../achievements',
    emptyOutDir: true,
  },
})
