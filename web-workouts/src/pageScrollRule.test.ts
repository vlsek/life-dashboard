import { describe, expect, it } from 'vitest'
// @ts-ignore — тест читает файлы соседних пилотов (типов node в сборке нет)
import { readdirSync, readFileSync } from 'node:fs'

// BACKLOG 63.1: на ПК при прокрутке ниже первого экрана пропадала шапка — `html, body, #app { height: 100% }` ограничивал «липкую» шапку (sticky)
// высотой одного экрана. Высота страницы должна быть «не меньше экрана» (min-height) во ВСЕХ пилотах.
const root = '..'
const sheets = (readdirSync(root) as string[])
  .filter((d: string) => d.startsWith('web-'))
  .map((d: string) => ({ d, path: `${root}/${d}/src/style.css` }))
  .filter(({ path }) => {
    try {
      readFileSync(path)
      return true
    } catch {
      return false
    }
  })

describe('высота страницы: не «ровно экран»', () => {
  it('нашлись таблицы стилей пилотов', () => expect(sheets.length).toBeGreaterThan(10))
  for (const { d, path } of sheets) {
    const css = readFileSync(path, 'utf-8')
    if (!/#app/.test(css)) continue
    it(`${d}: у html/body/#app нет height: 100% и есть min-height`, () => {
      expect(css).not.toMatch(/html,\s*body,\s*#app\s*\{[^}]*\bheight:\s*100%/)
      expect(css).toMatch(/body,\s*#app\s*\{\s*min-height:\s*100vh/)
    })
  }
})
