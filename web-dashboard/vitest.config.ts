import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

// Отдельный конфиг для тестов — не смешиваем с vite.config.ts (иначе vue-tsc пытается
// типизировать поле test: {...} по обычной схеме Vite и падает при сборке).
export default defineConfig({
  resolve: { alias: [{ find: /^vue$/, replacement: fileURLToPath(new URL('./node_modules/vue', import.meta.url)) }] },
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
  },
})
