import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Шестая страница пилота на Vue 3 + TS + Tailwind (после Истории, Вех, Календаря и Целей —
// см. ROADMAP.md, тикет B-skills). Собирается в ../skills-vue — отдельную папку в корне
// репозитория, раздаётся статикой рядом со старыми HTML-страницами.
export default defineConfig({
  base: '/skills-vue/',
  plugins: [vue(), tailwindcss()],
  build: {
    outDir: '../skills-vue',
    emptyOutDir: true,
  },
})
