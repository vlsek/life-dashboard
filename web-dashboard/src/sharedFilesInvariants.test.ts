// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в dateTimeAllPilots.test.ts)
import { readFileSync } from 'node:fs'
// @ts-ignore — то же
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
declare const __dirname: string // есть в vitest (node); типов node в проекте нет

// Общие файлы, которые правят ВСЕ агенты и которые ломаются при слияниях (config.js, version.json, COORDINATION.md).
// Каждое из условий уже однажды нарушалось: потерянные `]},` (v7.22/7.23), версия `3.100` вместо `4.00`, задвоенные разделы доски.
const ROOT = resolve(__dirname, '..', '..')
const read = (f: string): string => readFileSync(resolve(ROOT, f), 'utf-8')

const CFG = read('config.js')
const siteVersion = (/const SITE_VERSION = "([^"]+)"/.exec(CFG) || [])[1]
const block = (name: string): string => {
  const i = CFG.indexOf(`const ${name} = [`)
  return CFG.slice(i, CFG.indexOf('\n];', i))
}
const entries = (name: string): { version: string; date: string }[] => [...block(name).matchAll(/\{ version: "([^"]+)", date: "([^"]*)"/g)].map((m) => ({ version: m[1], date: m[2] }))
const num = (v: string): number => {
  const [a, b] = v.split('.')
  return Number(a) * 1000 + Number(b)
}
const RU = entries('CHANGELOG_RU')
const EN = entries('CHANGELOG_EN')
const VJ = JSON.parse(read('version.json')) as { version: string; min_supported: string; en: { version: string }[]; ru: { version: string }[] }

describe('версии: config.js ↔ журналы ↔ version.json', () => {
  it('формат X.YY: минор двузначный, после 2.99 идёт 3.00, а не 2.100 / 3.100', () => {
    expect(siteVersion).toMatch(/^\d+\.\d{2}$/)
    for (const e of [...RU, ...EN]) expect(e.version, e.version).toMatch(/^\d+\.\d{2}$/)
    expect(VJ.version).toMatch(/^\d+\.\d{2}$/)
  })

  it('SITE_VERSION = первая запись журнала RU = первая EN = version.json', () => {
    expect(RU[0].version).toBe(siteVersion)
    expect(EN[0].version).toBe(siteVersion)
    expect(VJ.version).toBe(siteVersion)
  })

  it('версии в журналах без дублей и строго по убыванию (новые сверху), RU и EN одинаковы', () => {
    for (const [name, list] of [['RU', RU], ['EN', EN]] as const) {
      const bad = list.slice(1).map((e, i) => [list[i].version, e.version]).filter(([prev, cur]) => num(prev) <= num(cur))
      expect(bad, `${name}: нарушен порядок или дубль`).toEqual([])
    }
    expect(RU.map((e) => e.version)).toEqual(EN.map((e) => e.version))
  })

  it('version.json отражает журналы: столько же записей, те же версии (python3 scripts/gen_version_json.py)', () => {
    expect(VJ.ru.map((e) => e.version)).toEqual(RU.map((e) => e.version))
    expect(VJ.en.map((e) => e.version)).toEqual(EN.map((e) => e.version))
    expect(num(VJ.min_supported)).toBeLessThanOrEqual(num(siteVersion))
  })
})

describe('COORDINATION.md: доска не задваивается', () => {
  const CO = read('COORDINATION.md')
  const count = (re: RegExp): number => (CO.match(re) || []).length

  it('основные разделы — ровно по одному', () => {
    for (const h of ['## ОБЩИЙ ПЛАН', '## Протокол', '## Сейчас в работе', '## Бэклог', '## Журнал', '### Ждёт владельца']) {
      expect(count(new RegExp(`^${h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gm')), h).toBe(1)
    }
  })

  it('блоки агентов 1–8 — ровно по одному, и в каждом есть текст', () => {
    for (let n = 1; n <= 8; n++) {
      expect(count(new RegExp(`^### Агент ${n}\\b`, 'gm')), `### Агент ${n}`).toBe(1)
      const m = new RegExp(`^### Агент ${n}\\b[^\\n]*\\n([\\s\\S]*?)(?=^#{2,3} )`, 'm').exec(CO)
      expect(m && m[1].trim().length, `### Агент ${n}: пустой блок`).toBeGreaterThan(5)
    }
  })
})
