import { describe, expect, it } from 'vitest'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в newGoalCopy.test.ts).
import { readdirSync, readFileSync } from 'node:fs'

// BACKLOG раздел 42, 🐞 8:54: кнопка «Избранное» (`.qn-toggle` в AppShell.vue) выглядела пустым кругом, потому что глобальное
// `@layer base { button { padding: .375rem .9rem } }` оставляло в круге 32 px место ~1 px, и сердечко-SVG сжималось flex-контейнером.
// AppShell.vue — копия в каждом пилоте; страж проходит по ВСЕМ пилотам и не даёт блоку разойтись.
const pilots: string[] = readdirSync('..').filter((d: string) => /^web-/.test(d)).filter((d: string) => {
  try { readFileSync(`../${d}/src/components/AppShell.vue`, 'utf-8'); return true } catch { return false }
})
const src = (d: string): string => readFileSync(`../${d}/src/components/AppShell.vue`, 'utf-8')
const rule = (css: string, sel: string): string => {
  const i = css.indexOf(sel + ' {')
  return i < 0 ? '' : css.slice(i, css.indexOf('}', i) + 1)
}

describe('кнопка «Избранное» (.qn-toggle) во всех пилотах', () => {
  it('нашлись пилоты с AppShell.vue (не меньше 14)', () => {
    expect(pilots.length).toBeGreaterThanOrEqual(14)
  })
  it.each(pilots)('%s: нулевой padding, сердечко не сжимается, контур не тусклый, размер 20 px', (d: string) => {
    const s = src(d)
    const toggle = rule(s, '.qn-toggle')
    expect(toggle).toMatch(/\bpadding:\s*0\s*;/)
    expect(toggle).toMatch(/color:\s*var\(--text\)\s*;/)
    expect(toggle).not.toMatch(/color:\s*var\(--text-dim\)/)
    expect(rule(s, '.qn-toggle svg')).toMatch(/flex:\s*none/)
    expect(s).toMatch(/<svg viewBox="0 0 24 24" width="20" height="20"[^>]*data-test="qn-heart"/)
  })
  it('блок кнопки одинаков во всех пилотах', () => {
    const block = (d: string) => {
      const s = src(d)
      const a = s.indexOf('.qn-toggle {')
      return s.slice(a, s.indexOf('.qn-toggle.qn-open svg path', a))
    }
    const first = block(pilots[0])
    for (const d of pilots) expect(block(d), d).toBe(first)
  })
  it.each(pilots)('%s: левое сердечко со списком — только на главной (BACKLOG 45.1)', (d: string) => {
    const s = src(d)
    const active = s.match(/const active(?:: string)? = '([a-z]+)'/)![1]
    expect(s).toMatch(/const isHome = String\(active\) === 'dashboard'/)
    expect(s).toMatch(/<template v-if="isHome">\s*<button\s+type="button"\s+class="qn-toggle"/)
    expect(s).toMatch(/<\/Transition>\s*<\/template>/)
    expect(active === 'dashboard').toBe(d === 'web-dashboard')
  })
})
