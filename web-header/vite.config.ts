import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// Глобальный хедер (BACKLOG 2.3): один самодостаточный бандл /header-widgets/header.js, который подключается
// на страницах пилота одной строкой <script type="module"> и сам монтируется в #topbar-right. Имя файла БЕЗ хеша —
// чтобы index.html страниц не менять при каждой пересборке; CSS вшит в JS (см. src/main.ts, `?inline`).
export default defineConfig({
  base: '/header-widgets/',
  plugins: [vue()],
  build: {
    outDir: '../header-widgets',
    emptyOutDir: true,
    cssCodeSplit: false,
    rollupOptions: {
      input: 'src/main.ts',
      output: { entryFileNames: 'header.js', chunkFileNames: 'header-[name].js', assetFileNames: 'header-[name][extname]' },
    },
  },
})
