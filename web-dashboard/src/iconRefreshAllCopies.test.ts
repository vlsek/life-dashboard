import { describe, expect, it } from 'vitest'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в dateTimeAllPilots.test.ts).
import { existsSync, readdirSync, readFileSync } from 'node:fs'

// «Страж» (BACKLOG 706, срез 1): 19 перерисованных иконок одинаковы в config.js и во всех web-*/src/lib/icons.ts.
// Источник правды — scripts/apply_icon_refresh.py; руками тела не правим.
const ROOT = '..'
const KEYS = ['run', 'walk', 'yoga', 'swim', 'stretch', 'boxing', 'jumprope', 'treadmill', 'ski', 'bandage', 'broom', 'party', 'tree', 'snow', 'bird', 'fish', 'guitar', 'cake', 'lungs']
const read = (p: string): string => readFileSync(p, 'utf-8')

function iconBodies(file: string): Record<string, string> {
  const t = read(file)
  const a = t.indexOf('ICON_PATHS = {')
  const b = t.indexOf('\n}', a)
  const out: Record<string, string> = {}
  for (const m of t.slice(a, b).matchAll(/^\s*(\w+):\s*'(.*)',?\s*$/gm)) out[m[1]] = m[2].replace(/\\"/g, '"')
  return out
}

const files: string[] = (readdirSync(ROOT) as string[])
  .filter((d: string) => /^web-/.test(d) && d !== 'web-header' && existsSync(`${ROOT}/${d}/src/lib/icons.ts`)) // web-header — урезанный набор (капля и весы)
  .map((d: string) => `${ROOT}/${d}/src/lib/icons.ts`)
const ref = iconBodies(`${ROOT}/config.js`)

describe('перерисованные иконки — одинаково во всех копиях набора', () => {
  it('копии найдены', () => expect(files.length).toBeGreaterThanOrEqual(15))
  it('в config.js все 19 иконок есть и это настоящая разметка SVG (не пусто)', () => {
    for (const k of KEYS) expect(ref[k], k).toMatch(/^<(path|circle|rect|line|polyline|ellipse)\b/)
  })
  it('каждая копия icons.ts совпадает с config.js по всем 19 ключам', () => {
    const bad: string[] = []
    for (const f of files) {
      const c = iconBodies(f)
      for (const k of KEYS) if (c[k] !== ref[k]) bad.push(`${f}:${k}`)
    }
    expect(bad).toEqual([])
  })
  it('разметка без внешних ссылок и скриптов', () => {
    for (const k of KEYS) expect(ref[k]).not.toMatch(/<script|href=|xlink|style=/i)
  })
})
