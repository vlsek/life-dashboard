import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Восьмая страница пилота на Vue 3 + TS + Tailwind (после Истории, Вех, Календаря, Целей,
// Навыков, Аккаунта и Магазина — см. ROADMAP.md, тикет B-challenges). Собирается в
// ../challenges-vue — отдельную папку в корне репозитория, раздаётся Cloudflare Workers
// как статика рядом со старыми HTML-страницами.
export default defineConfig({
  base: '/challenges-vue/',
  plugins: [vue(), tailwindcss()],
  build: {
    outDir: '../challenges-vue',
    emptyOutDir: true,
  },
})
