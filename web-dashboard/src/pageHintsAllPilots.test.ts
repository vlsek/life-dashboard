import { describe, expect, it } from 'vitest'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в themeDefaultAllPilots.test.ts).
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { PAGE_HINTS } from './lib/pageHints'

// Страж (BACKLOG 49.4): копии pageHints.ts / PageHint.vue одинаковы во всех пилотах; у каждой страницы есть подсказка на обоих языках;
// каждый AppShell подключает значок «i» со своим ключом страницы.
const root = '..'
const pilots: string[] = (readdirSync(root) as string[]).filter((d: string) => d.startsWith('web-') && existsSync(`${root}/${d}/src/components/AppShell.vue`))
const read = (p: string, f: string): string => readFileSync(`${root}/${p}/${f}`, 'utf8')

describe('подсказки страниц во всех пилотах', () => {
  it('копии lib/pageHints.ts и components/PageHint.vue совпадают с dashboard', () => {
    expect(pilots.length).toBeGreaterThanOrEqual(14)
    const lib = read('web-dashboard', 'src/lib/pageHints.ts')
    const cmp = read('web-dashboard', 'src/components/PageHint.vue')
    for (const p of pilots) {
      expect(read(p, 'src/lib/pageHints.ts'), p).toBe(lib)
      expect(read(p, 'src/components/PageHint.vue'), p).toBe(cmp)
    }
  })

  it('AppShell каждого пилота подключает <PageHint page="…"> с ключом из словаря', () => {
    for (const p of pilots) {
      const m = /<PageHint page="(\w+)"/.exec(read(p, 'src/components/AppShell.vue'))
      expect(m, p).not.toBeNull()
      expect(Object.keys(PAGE_HINTS), p).toContain(m![1])
    }
  })

  it('значок «i» стоит под шапкой, а не внутри неё (владелец: шапка и так загружена)', () => {
    for (const p of pilots) {
      const src = read(p, 'src/components/AppShell.vue')
      const topbar = src.indexOf('id="topbar-right"')
      const hint = src.indexOf('<PageHint')
      expect(src.slice(topbar, hint), p).toMatch(/<\/div>\s*<\/div>\s*$/)
    }
  })

  it('у каждой страницы есть русский и английский текст с 3 советами', () => {
    for (const [page, v] of Object.entries(PAGE_HINTS)) {
      for (const lang of ['ru', 'en'] as const) {
        expect(v[lang].title, page + lang).not.toBe('')
        expect(v[lang].tips.length, page + lang).toBe(3)
      }
    }
  })
})
