import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Страница на Vue 3 + TS + Tailwind. Фаза 2 (см. COORDINATION.md): пилот переехал на короткий
// адрес /calendar/ (без -vue) — теперь это и есть основной раздел «Календарь», классическая
// версия перенесена в /legacy/calendar.html. Собирается в ../calendar — отдельную папку в корне
// репозитория, которую Cloudflare Workers раздаёт как статику. base совпадает с этим путём,
// чтобы собранные ссылки на ассеты (/calendar/assets/...) резолвились правильно после деплоя.
// Keep this pilot self-contained: production build must not import sibling web-* projects.
export default defineConfig({
  base: '/calendar/',
  plugins: [vue(), tailwindcss()],
  build: {
    outDir: '../calendar',
    emptyOutDir: true,
  },
})
