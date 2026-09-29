import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Дашборд — самая большая и сложная страница пилота (см. ROADMAP.md, тикет B-dashboard),
// переносится в несколько итераций: сначала бизнес-логика с тестами (метрики/стрики/
// прогресс дня и недели — lib/metrics.ts, lib/streaks.ts, lib/progress.ts), потом UI блоками.
// Собирается в ../dashboard — отдельную папку в корне репозитория, раздаётся статикой
// рядом со старыми HTML-страницами.
export default defineConfig({
  base: '/dashboard/',
  plugins: [vue(), tailwindcss()],
  build: {
    outDir: '../dashboard',
    emptyOutDir: true,
  },
})
