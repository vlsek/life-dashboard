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
