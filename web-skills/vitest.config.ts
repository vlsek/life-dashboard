import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// Отдельный конфиг для тестов — не смешиваем с vite.config.ts (иначе vue-tsc пытается
// типизировать поле test: {...} по обычной схеме Vite и падает при сборке).
export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
  },
})
