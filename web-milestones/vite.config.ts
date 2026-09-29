import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Вторая страница пилота на Vue 3 + TS + Tailwind (после Истории — см. web-history/ и
// ROADMAP.md, лейн B3). Собирается в ../milestones (фаза 2: короткий адрес без -vue) — отдельную папку в корне
// репозитория, раздаётся Cloudflare Workers как статика рядом со старыми HTML-страницами.
// base совпадает с этим путём, чтобы собранные ссылки на ассеты резолвились правильно.
export default defineConfig({
  base: '/milestones/',
  plugins: [vue(), tailwindcss()],
  build: {
    outDir: '../milestones',
    emptyOutDir: true,
  },
})
