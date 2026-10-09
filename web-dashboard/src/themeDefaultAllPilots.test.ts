import { describe, expect, it } from 'vitest'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в dateTimeAllPilots.test.ts).
import { existsSync, readdirSync, readFileSync } from 'node:fs'

// «Страж» (BACKLOG 49.9): светлая тема — по умолчанию, пока человек сам не выбрал другую (в localStorage нет `site_theme`).
// Сохранённый выбор не трогаем. Значение по умолчанию живёт в трёх местах каждой страницы — проверяем все.
const ROOT = '..'
const read = (p: string): string => readFileSync(p, 'utf-8')
const pilots: string[] = (readdirSync(ROOT) as string[]).filter((d: string) => /^web-/.test(d))

describe('тема по умолчанию — светлая во всех пилотах', () => {
  it('встроенный скрипт каждой страницы (против «мигания») берёт light, если тема не сохранена', () => {
    const pages = pilots.filter((d) => existsSync(`${ROOT}/${d}/index.html`) && read(`${ROOT}/${d}/index.html`).includes('site_theme'))
    expect(pages.length).toBeGreaterThanOrEqual(14)
    for (const d of pages) {
      const html = read(`${ROOT}/${d}/index.html`)
      expect(html, d).toMatch(/getItem\('site_theme'\) \|\| 'light'/)
      expect(html, d).not.toMatch(/getItem\('site_theme'\) \|\| 'dark'/)
    }
  })

  it('getTheme() каждого пилота (и шапки) возвращает light без сохранённого значения', () => {
    const files = [...pilots.map((d) => `${ROOT}/${d}/src/lib/theme.ts`), `${ROOT}/web-header/src/lib/prefs.ts`].filter((f) => existsSync(f))
    expect(files.length).toBeGreaterThanOrEqual(14)
    for (const f of files) {
      const src = read(f)
      expect(src, f).toContain("(v as ThemeKey) : 'light'")
      expect(src, f).not.toContain("(v as ThemeKey) : 'dark'")
    }
  })

  it('общие theme.js и admin.html тоже: по умолчанию light', () => {
    expect(read(`${ROOT}/theme.js`)).toContain('getItem("site_theme") || "light"')
    expect(read(`${ROOT}/admin.html`)).toContain('getItem("site_theme")||"light"')
  })
})
