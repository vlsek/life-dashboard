import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Страница входа/регистрации на Vue 3 + TS + Tailwind — см. ROADMAP.md, тикет
// B-login-onboarding. Собирается в ../login (фаза 2: короткий адрес без -vue) (отдельная папка в корне репозитория,
// раздаётся как статика рядом со старым login.html, который пока остаётся рабочим).
export default defineConfig({
  base: '/login/',
  plugins: [vue(), tailwindcss()],
  build: {
    outDir: '../login',
    emptyOutDir: true,
  },
})
