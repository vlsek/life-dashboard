import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Страница онбординга на Vue 3 + TS + Tailwind — см. docs/ROADMAP.md, тикет
// B-login-onboarding. Собирается в ../onboarding (фаза 2: короткий адрес без -vue).
export default defineConfig({
  base: '/onboarding/',
  plugins: [vue(), tailwindcss()],
  build: {
    outDir: '../onboarding',
    emptyOutDir: true,
  },
})
