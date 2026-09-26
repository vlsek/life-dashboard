import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Пилотная страница на Vue 3 + TS + Tailwind (постепенный переезд, начиная с одной
// самостоятельной страницы — см. обсуждение в чате). Собирается в ../history-vue —
// отдельную папку в корне репозитория, которая раздаётся Cloudflare Workers как статика,
// рядом со старыми HTML-страницами. base совпадает с этим путём, чтобы собранные ссылки
// на ассеты (/history-vue/assets/...) резолвились правильно после деплоя.
export default defineConfig({
  base: '/history-vue/',
  plugins: [vue(), tailwindcss()],
  build: {
    outDir: '../history-vue',
    emptyOutDir: true,
  },
})
