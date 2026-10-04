import { describe, expect, it } from 'vitest'

// Файлы читаем через node:fs; имя модуля собрано строкой, чтобы vue-tsc не требовал @types/node для тестов пилота.
async function readSrc(rel: string): Promise<string> {
  const fs = (await import(/* @vite-ignore */ 'node:' + 'fs')) as { readFileSync: (p: URL, enc: string) => string }
  return fs.readFileSync(new URL(rel, import.meta.url), 'utf-8')
}
// Тело файла без ведущих строк-комментариев (в копиях они свои)
const body = (s: string) => s.split('\n').filter((_l, i, a) => !a.slice(0, i + 1).every((x) => x.startsWith('//'))).join('\n').trim()

describe('копии frames.ts совпадают (страж от расхождения)', () => {
  it('web-header и web-community держат ту же таблицу и функцию, что страница «Кастомизация»', async () => {
    const orig = body(await readSrc('./frames.ts'))
    expect(orig).toContain('FRAME_SHADOWS')
    expect(body(await readSrc('../../../web-header/src/lib/customFrame.ts'))).toBe(orig)
    expect(body(await readSrc('../../../web-community/src/lib/customFrame.ts'))).toBe(orig)
  })
})

describe('стили анимированных рамок есть везде, где рисуется аватар (страж)', () => {
  it('в style.css Кастомизации и Сообщества и header.css шапки: keyframes, класс и отключение при reduced-motion', async () => {
    const { FRAME_ANIMATIONS } = await import('./frames')
    const files = ['./../style.css', '../../../web-community/src/style.css', '../../../web-header/src/header.css']
    for (const f of files) {
      const css = await readSrc(f)
      for (const cls of Object.values(FRAME_ANIMATIONS)) {
        expect(css, f + ' ' + cls).toContain('@keyframes ' + cls)
        expect(css, f + ' ' + cls).toMatch(new RegExp('\\.' + cls + ' \\{ animation: ' + cls))
      }
      // одно правило reduced-motion перечисляет ВСЕ анимированные классы
      const list = Object.values(FRAME_ANIMATIONS).map((c) => '\\.' + c).join(', ')
      expect(css, f).toContain('@media (prefers-reduced-motion: reduce) { ' + list.replace(/\\\./g, '.') + ' { animation: none; } }')
    }
  })
})
