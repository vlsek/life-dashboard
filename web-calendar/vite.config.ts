import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Третья страница пилота на Vue 3 + TS + Tailwind (после Истории и Вех — см.
// ROADMAP.md, тикет B-calendar). Собирается в ../calendar-vue — отдельную папку в
// корне репозитория, раздаётся Cloudflare Workers как статика рядом со старыми
// HTML-страницами. base совпадает с этим путём, чтобы ссылки на ассеты резолвились.
export default defineConfig({
  base: '/calendar-vue/',
  plugins: [vue(), tailwindcss()],
  build: {
    outDir: '../calendar-vue',
    emptyOutDir: true,
  },
})
