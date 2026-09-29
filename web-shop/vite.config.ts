import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Страница на Vue 3 + TS + Tailwind. Фаза 2 (см. COORDINATION.md): пилот переехал на короткий
// адрес /shop/ (без -vue) — теперь это и есть основной раздел «Магазин», классическая версия
// перенесена в /legacy/shop.html. Собирается в ../shop — отдельную папку в корне репозитория,
// которую Cloudflare Workers раздаёт как статику. base совпадает с этим путём, чтобы собранные
// ссылки на ассеты (/shop/assets/...) резолвились правильно после деплоя.
export default defineConfig({
  base: '/shop/',
  plugins: [vue(), tailwindcss()],
  build: {
    outDir: '../shop',
    emptyOutDir: true,
  },
})
