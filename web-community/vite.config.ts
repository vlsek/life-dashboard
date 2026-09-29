import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Шестая страница пилота на Vue 3 + TS + Tailwind — см. ROADMAP.md, тикет B-community.
// Собирается в ../community (фаза 2: короткий адрес без -vue) — отдельную папку в корне репозитория, раздаётся
// Cloudflare Workers как статика рядом со старыми HTML-страницами.
export default defineConfig({
  base: '/community/',
  plugins: [vue(), tailwindcss()],
  build: {
    outDir: '../community',
    emptyOutDir: true,
  },
})
