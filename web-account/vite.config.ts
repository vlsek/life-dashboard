import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Пилотная страница на Vue 3 + TS + Tailwind (B3 из ROADMAP — третья самостоятельная
// страница после Истории и Вех). Собирается в ../account (фаза 2: короткий адрес без -vue) — отдельную папку в корне
// репозитория, которая раздаётся Cloudflare Workers как статика, рядом со старыми
// HTML-страницами. base совпадает с этим путём, чтобы собранные ссылки на ассеты
// (/account/assets/...) резолвились правильно после деплоя.
export default defineConfig({
  base: '/account/',
  plugins: [vue(), tailwindcss()],
  build: {
    outDir: '../account',
    emptyOutDir: true,
  },
})
