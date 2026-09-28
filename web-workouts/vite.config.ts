import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Пилотная страница на Vue 3 + TS + Tailwind — перенос workouts.js/html, итерациями
// (как и Dashboard): итерация 1 — CRUD упражнений/записей, рекорды, категории, шаблоны.
// Мини-графики и общий график объёма — отдельная итерация. Собирается в ../workouts-vue.
export default defineConfig({
  base: '/workouts-vue/',
  plugins: [vue(), tailwindcss()],
  build: {
    outDir: '../workouts-vue',
    emptyOutDir: true,
  },
})
