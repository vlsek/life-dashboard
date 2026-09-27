import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Пятая страница пилота на Vue 3 + TS + Tailwind (после Истории, Вех, Календаря и Целей
// — см. ROADMAP.md, тикет B-shop). Собирается в ../shop-vue — отдельную папку в корне
// репозитория, раздаётся Cloudflare Workers как статика рядом со старыми HTML-страницами.
export default defineConfig({
  base: '/shop-vue/',
  plugins: [vue(), tailwindcss()],
  build: {
    outDir: '../shop-vue',
    emptyOutDir: true,
  },
})
