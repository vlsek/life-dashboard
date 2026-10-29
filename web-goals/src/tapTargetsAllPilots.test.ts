import { describe, expect, it } from 'vitest'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в dateTimeAllPilots.test.ts).
import { existsSync, readdirSync, readFileSync } from 'node:fs'

// «Страж» (BACKLOG 576 / 60.2 п.4): в style.css каждого пилота есть блок `tap-targets` — на телефоне (≤640 px)
// кнопки подтягиваются до 32 px. Блок меняется только в scripts/apply_tap_targets.py.
// web-header — отдельный бандл (header.css), вне охвата.
const ROOT = '..'
const EXEMPT = ['web-header']
const read = (path: string): string => readFileSync(path, 'utf-8')
const pilots: string[] = (readdirSync(ROOT) as string[]).filter(
  (d: string) => /^web-/.test(d) && !EXEMPT.includes(d) && existsSync(`${ROOT}/${d}/src/style.css`),
)

describe('минимум цели нажатия на телефоне во всех пилотах', () => {
  it('пилоты найдены', () => {
    expect(pilots.length).toBeGreaterThan(5)
  })
  for (const p of pilots) {
    it(`${p}: блок tap-targets с min-height 32px в @media (max-width: 640px)`, () => {
      const css = read(`${ROOT}/${p}/src/style.css`)
      expect(css).toContain('/* tap-targets */')
      const block = css.slice(css.indexOf('/* tap-targets */'))
      expect(block).toMatch(/@media \(max-width: 640px\)/)
      expect(block).toMatch(/min-height:\s*32px/)
      expect(block).toMatch(/min-width:\s*32px/)
    })
  }
  it('все пилоты получают тот же блок, что и в скрипте', () => {
    const script = read(`${ROOT}/scripts/apply_tap_targets.py`)
    const rule = /(button:not\(\.ph-btn\)[^{]*)\{/.exec(script)
    expect(rule).not.toBeNull()
    for (const p of pilots) expect(read(`${ROOT}/${p}/src/style.css`)).toContain((rule as RegExpExecArray)[1].trim())
  })
})
