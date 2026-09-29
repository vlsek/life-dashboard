import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Страница онбординга на Vue 3 + TS + Tailwind — см. docs/ROADMAP.md, тикет
// B-login-onboarding. Собирается в ../onboarding-vue.
export default defineConfig({
  base: '/onboarding-vue/',
  plugins: [vue(), tailwindcss()],
  build: {
    outDir: '../onboarding-vue',
    emptyOutDir: true,
  },
})
