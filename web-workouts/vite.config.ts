import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Страница на Vue 3 + TS + Tailwind (перенос workouts.js/html, обе итерации закрыты). Фаза 2
// (см. COORDINATION.md): пилот переехал на короткий адрес /workouts/ (без -vue) — теперь это и
// есть основной раздел «Тренировки», классическая версия перенесена в /legacy/workouts.html.
// Собирается в ../workouts — отдельную папку в корне репозитория, которую Cloudflare Workers
// раздаёт как статику. base совпадает с этим путём, чтобы ссылки на ассеты резолвились верно.
export default defineConfig({
  base: '/workouts/',
  plugins: [vue(), tailwindcss()],
  build: {
    outDir: '../workouts',
    emptyOutDir: true,
  },
})
