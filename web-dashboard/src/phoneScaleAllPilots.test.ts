import { describe, expect, it } from 'vitest'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в dateTimeAllPilots.test.ts).
import { existsSync, readdirSync, readFileSync } from 'node:fs'

// «Страж» (BACKLOG 863, «на телефоне всё слишком крупное»): на каждой странице пилота на узком экране корневой шрифт уменьшен
// одним правилом (все размеры Tailwind — в rem). Блок выдаёт scripts/apply_phone_scale.py; степень уменьшения — --phone-scale.
const ROOT = '..'
const read = (p: string): string => readFileSync(p, 'utf-8')
const pilots: string[] = (readdirSync(ROOT) as string[]).filter((d: string) => /^web-/.test(d) && existsSync(`${ROOT}/${d}/src/style.css`))
const block = (css: string): string | null => /\/\* phone-scale:start[\s\S]*?\/\* phone-scale:end \*\//.exec(css)?.[0] ?? null
const scaleOf = (b: string): number => parseFloat(/--phone-scale:\s*([\d.]+)%/.exec(b)?.[1] ?? 'NaN')

describe('масштаб интерфейса на телефоне — одинаково во всех пилотах', () => {
  it('пилоты найдены', () => expect(pilots.length).toBeGreaterThanOrEqual(15))
  const blocks = pilots.map((d: string) => ({ d, b: block(read(`${ROOT}/${d}/src/style.css`)) }))
  it('в каждом style.css есть блок phone-scale, ровно один', () => {
    expect(blocks.filter((x) => !x.b).map((x) => x.d)).toEqual([])
    for (const d of pilots) expect((read(`${ROOT}/${d}/src/style.css`).match(/phone-scale:start/g) ?? []).length).toBe(1)
  })
  it('блок одинаков во всех пилотах', () => {
    expect(new Set(blocks.map((x) => x.b)).size).toBe(1)
  })
  it('уменьшение действует только на узких экранах и в разумных пределах (80–100 %)', () => {
    const b = blocks[0].b as string
    expect(b).toMatch(/@media \(max-width: 640px\)\s*\{\s*html\s*\{\s*font-size:\s*var\(--phone-scale\);/)
    expect(scaleOf(b)).toBeGreaterThanOrEqual(80)
    expect(scaleOf(b)).toBeLessThanOrEqual(100)
  })
  it('нигде нет другого html { font-size } вне блока (иначе масштаб перебьётся)', () => {
    for (const d of pilots) {
      const css = read(`${ROOT}/${d}/src/style.css`).replace(/\/\* phone-scale:start[\s\S]*?\/\* phone-scale:end \*\//, '')
      expect(/(^|\n)\s*(html|:root)\s*\{[^}]*font-size/.test(css)).toBe(false)
    }
  })
})
