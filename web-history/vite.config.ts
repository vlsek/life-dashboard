import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Страница на Vue 3 + TS + Tailwind. Фаза 2 (см. COORDINATION.md): пилот переехал на короткий
// адрес /history/ (без -vue) — теперь это и есть основной раздел «История», классическая
// версия перенесена в /legacy/history.html. Собирается в ../history — отдельную папку в корне
// репозитория, которую Cloudflare Workers раздаёт как статику. base совпадает с этим путём,
// чтобы собранные ссылки на ассеты (/history/assets/...) резолвились правильно после деплоя.
export default defineConfig({
  base: '/history/',
  plugins: [vue(), tailwindcss()],
  build: {
    outDir: '../history',
    emptyOutDir: true,
  },
})
