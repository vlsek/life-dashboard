import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Страница на Vue 3 + TS + Tailwind. Фаза 2 (см. COORDINATION.md): пилот переехал на короткий
// адрес /challenges/ (без -vue) — теперь это и есть основной раздел «Челленджи», классическая
// версия перенесена в /legacy/challenges.html. Собирается в ../challenges — отдельную папку в
// корне репозитория, которую Cloudflare Workers раздаёт как статику. base совпадает с этим
// путём, чтобы собранные ссылки на ассеты (/challenges/assets/...) резолвились правильно.
export default defineConfig({
  base: '/challenges/',
  plugins: [vue(), tailwindcss()],
  build: {
    outDir: '../challenges',
    emptyOutDir: true,
  },
})
