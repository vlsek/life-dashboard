import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

// Дашборд — самая большая и сложная страница пилота (см. ROADMAP.md, тикет B-dashboard),
// переносится в несколько итераций: сначала бизнес-логика с тестами (метрики/стрики/
// прогресс дня и недели — lib/metrics.ts, lib/streaks.ts, lib/progress.ts), потом UI блоками.
// Собирается в ../dashboard — отдельную папку в корне репозитория, раздаётся статикой
// рядом со старыми HTML-страницами.
export default defineConfig({
  base: '/dashboard/',
  // shared/ лежит вне пилота (BACKLOG 762 срез 2, вариант Б): общий .vue-код должен брать `vue` из node_modules пилота
  resolve: { alias: [{ find: /^vue$/, replacement: fileURLToPath(new URL('./node_modules/vue', import.meta.url)) }] },
  plugins: [vue(), tailwindcss()],
  build: {
    outDir: '../dashboard',
    emptyOutDir: true,
  },
})
