import { describe, expect, it } from 'vitest'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в newGoalCopy.test.ts).
import { readdirSync, readFileSync } from 'node:fs'

// BACKLOG 44.15: боковое меню одинаково во всех пилотах (AppShell.vue — копия), а ключи «избранного» в web-header покрывают КАЖДУЮ
// страницу меню — у каждой есть сердечко «в избранное» в шапке (раньше его не было у главной, «Достижений» и «Кастомизации»).
const pilots: string[] = readdirSync('..').filter((d: string) => /^web-/.test(d)).filter((d: string) => {
  try { readFileSync(`../${d}/src/components/AppShell.vue`, 'utf-8'); return true } catch { return false }
})
const keysIn = (src: string, from: string, re: RegExp): string[] => {
  const a = src.indexOf(from)
  return [...src.slice(a, src.indexOf('\n]', a) > a ? src.indexOf('\n]', a) : src.indexOf('\n}', a)).matchAll(re)].map((m) => m[1])
}
const menuKeys = (d: string): string[] => keysIn(readFileSync(`../${d}/src/components/AppShell.vue`, 'utf-8'), 'const pages: NavPage[] = [', /key:\s*'([a-z]+)'/g)

describe('боковое меню и избранное', () => {
  it('нашлись пилоты (не меньше 14)', () => expect(pilots.length).toBeGreaterThanOrEqual(14))
  it('во всех пилотах меню одинаковое и без «Истории»', () => {
    const first = menuKeys(pilots[0])
    expect(first.length).toBeGreaterThan(8)
    expect(first).not.toContain('history')
    for (const d of pilots) expect(menuKeys(d), d).toEqual(first)
  })
  it('у КАЖДОЙ страницы меню, кроме главной, есть сердечко «в избранное» (ключи в web-header/favorites.ts), в том же порядке', () => {
    const fav: string = readFileSync('../web-header/src/lib/favorites.ts', 'utf-8')
    const a = fav.indexOf('const PAGE_KEYS')
    const values = [...fav.slice(a, fav.indexOf('\n}', a)).matchAll(/:\s*'([a-z]+)'/g)].map((m) => m[1])
    expect(values).toEqual(menuKeys(pilots[0]).filter((k) => k !== 'dashboard')) // главная — вход в избранное, сама не добавляется (45.1)
  })
})
