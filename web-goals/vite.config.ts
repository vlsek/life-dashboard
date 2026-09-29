import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Четвёртая страница пилота на Vue 3 + TS + Tailwind (после Истории, Вех и Календаря —
// см. ROADMAP.md, тикет B-goals). Собирается в ../goals (фаза 2: короткий адрес без -vue) — отдельную папку в корне
// репозитория, раздаётся Cloudflare Workers как статика рядом со старыми HTML-страницами.
export default defineConfig({
  base: '/goals/',
  plugins: [vue(), tailwindcss()],
  build: {
    outDir: '../goals',
    emptyOutDir: true,
  },
})
