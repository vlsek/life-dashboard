// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в noConflictMarkers.test.ts)
import { readFileSync, readdirSync } from 'node:fs'
// @ts-ignore — то же
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
declare const __dirname: string // есть в vitest (node); типов node в проекте нет

// Проверка доступности (axe, 74.5): выпадающий список темы в сайдбаре каждой страницы должен иметь название для скринридера.
describe('сайдбар: селектор темы подписан во всех пилотах', () => {
  it('у каждого <select> в AppShell.vue есть aria-label', () => {
    const root = resolve(__dirname, '..', '..')
    const dirs = (readdirSync(root) as string[]).filter((d: string) => d.startsWith('web-'))
    let checked = 0
    for (const d of dirs) {
      let src = ''
      try {
        src = readFileSync(resolve(root, d, 'src', 'components', 'AppShell.vue'), 'utf-8') as string
      } catch {
        continue
      }
      for (const m of src.matchAll(/<select\b[^>]*>/g)) {
        checked++
        expect(m[0], d).toMatch(/aria-label=/)
      }
    }
    expect(checked).toBeGreaterThanOrEqual(14)
  })
})
