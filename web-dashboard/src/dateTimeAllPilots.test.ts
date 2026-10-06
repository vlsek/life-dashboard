import { describe, expect, it } from 'vitest'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в selectsAllPilots.test.ts).
import { existsSync, readdirSync, readFileSync } from 'node:fs'

// «Страж» (BACKLOG 567): нативные поля даты и времени оформлены единообразно на каждой странице пилота.
// (1) У КАЖДОЙ темы есть `color-scheme`, и он совпадает с яркостью фона темы: иначе на тёмной теме значок календаря и
// всплывающий пикер светлые (в пилотах блок `themes-scheme` покрывает только новые темы — для четырёх исходных правило
// живёт в блоке `date-time-fields`). (2) Правило значка календаря/часов есть в style.css и в собранном css.
// Блок меняется только в scripts/apply_date_time_css.py. web-header — отдельный бандл (header.css), вне охвата.
const ROOT = '..'
const EXEMPT = ['web-header']
const read = (path: string): string => readFileSync(path, 'utf-8')
const pilots: string[] = (readdirSync(ROOT) as string[]).filter(
  (d: string) => /^web-/.test(d) && !EXEMPT.includes(d) && existsSync(`${ROOT}/${d}/src/style.css`),
)

// Тема → 'dark' | 'light' по яркости --bg (первое объявление внутри блока `html.theme-X { … }`).
function themeKinds(css: string): Record<string, 'dark' | 'light'> {
  const out: Record<string, 'dark' | 'light'> = {}
  const re = /(?:^|\n)html\.theme-([a-z]+)\s*\{([^}]*)\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(css))) {
    const bg = /--bg:\s*#([0-9a-fA-F]{6})\b/.exec(m[2])
    if (!bg) continue
    const n = parseInt(bg[1], 16)
    const lum = (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255
    out[m[1]] = lum < 0.5 ? 'dark' : 'light'
  }
  return out
}

// Тема → заявленный color-scheme (селекторы могут быть списком через запятую).
function declaredSchemes(css: string): Record<string, string> {
  const out: Record<string, string> = {}
  const re = /((?:html\.theme-[a-z]+\s*,\s*)*html\.theme-[a-z]+)\s*\{\s*color-scheme:\s*(dark|light)\s*;?\s*\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(css))) {
    for (const key of m[1].match(/theme-([a-z]+)/g) ?? []) out[key.replace('theme-', '')] = m[2]
  }
  return out
}

describe('нативные поля даты/времени: единое оформление на каждой странице пилота', () => {
  it('нашлись страницы пилота (тест не пустой)', () => {
    expect(pilots.length).toBeGreaterThanOrEqual(14)
  })

  for (const pilot of pilots) {
    const css = read(`${ROOT}/${pilot}/src/style.css`)

    it(`${pilot}: у каждой темы color-scheme совпадает с яркостью её фона`, () => {
      const kinds = themeKinds(css)
      const declared = declaredSchemes(css)
      expect(Object.keys(kinds).length, 'не нашлись темы html.theme-*').toBeGreaterThanOrEqual(11)
      for (const [theme, kind] of Object.entries(kinds)) {
        expect(declared[theme], `тема ${theme}: нет color-scheme (значок календаря/пикер будут не по теме)`).toBe(kind)
      }
    })

    it(`${pilot}: правило значка календаря/часов в style.css`, () => {
      expect(css).toContain('/* date-time-fields */')
      expect(css).toMatch(/input\[type='date'\]::-webkit-calendar-picker-indicator[^{]*\{[^}]*cursor:\s*pointer/)
      expect(css).toMatch(/input\[type='time'\]::-webkit-calendar-picker-indicator:hover/)
      expect(css).toMatch(/color-mix\(in srgb, var\(--accent\)/)
    })

    it(`${pilot}: правило есть в СОБРАННОМ css (то, что реально раздаётся)`, () => {
      const built = `${ROOT}/${pilot.replace(/^web-/, '')}/assets`
      if (!existsSync(built)) return
      const all: string = (readdirSync(built) as string[])
        .filter((f: string) => f.endsWith('.css'))
        .map((f: string) => read(`${built}/${f}`))
        .join('\n')
      // `:hover` — отличительный признак нашего правила: голое `::-webkit-calendar-picker-indicator` есть и в preflight Tailwind.
      expect(all, 'в собранном css нет правила для даты/времени — пересоберите пилот (npm run build)').toMatch(
        /calendar-picker-indicator:hover/,
      )
    })
  }

  it('значок календаря не лежит внутри невидимого поля DateStepper (его input остаётся прозрачным)', () => {
    const css = read(`${ROOT}/web-dashboard/src/style.css`)
    expect(css).toMatch(/\.date-stepper-input\s*\{[^}]*opacity:\s*0/)
  })
})
