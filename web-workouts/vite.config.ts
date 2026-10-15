import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

// Страница на Vue 3 + TS + Tailwind (перенос workouts.js/html, обе итерации закрыты). Фаза 2
// (см. COORDINATION.md): пилот переехал на короткий адрес /workouts/ (без -vue) — теперь это и
// есть основной раздел «Тренировки», классическая версия перенесена в /legacy/workouts.html.
// Собирается в ../workouts — отдельную папку в корне репозитория, которую Cloudflare Workers
// раздаёт как статику. base совпадает с этим путём, чтобы ссылки на ассеты резолвились верно.
export default defineConfig({
  base: '/workouts/',
  // shared/ лежит вне пилота (BACKLOG 762 срез 2, вариант Б): общий .vue-код должен брать `vue` из node_modules пилота
  resolve: { alias: [{ find: /^vue$/, replacement: fileURLToPath(new URL('./node_modules/vue', import.meta.url)) }] },
  plugins: [vue(), tailwindcss()],
  build: {
    outDir: '../workouts',
    emptyOutDir: true,
  },
})
