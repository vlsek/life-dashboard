// @ts-ignore — в проекте нет типов node, а vitest выполняется в node; ?raw для .css в vitest отдаёт пустую строку.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css: string = readFileSync('src/style.css', 'utf-8') // vitest запускается из папки web-dashboard/

// happy-dom не считает стили из .css, поэтому проверяем сам источник: правило контура огня
// для темы Monet (BACKLOG 1.1) не должно потеряться при правках style.css.
describe('streak flame in the Monet theme', () => {
  it('has an accent outline rule for .fl-outer under html.theme-monet', () => {
    const m = css.match(/html\.theme-monet \.streak-flame \.fl-outer\s*\{([^}]*)\}/)
    expect(m).not.toBeNull()
    expect(m![1]).toContain('stroke: var(--accent)')
    expect(m![1]).toMatch(/stroke-width:\s*0\.6/)
  })
})

describe('bonus (100%+) ring color', () => {
  it('is a theme-accent tint, not a hardcoded crimson', () => {
    const m = css.match(/\.ring-bonus\s*\{([^}]*)\}/)
    expect(m).not.toBeNull()
    expect(m![1]).toContain('var(--accent)')
    expect(m![1]).not.toContain('#d6336c')
  })
  it('all ring components use the class instead of a fixed stroke', () => {
    for (const f of ['ProgressRing', 'AvatarProgress', 'HeaderProgressBadge']) {
      const src: string = readFileSync(`src/components/${f}.vue`, 'utf-8')
      expect(src, f).toContain('class="ring-bonus"')
      expect(src, f).not.toContain('#d6336c')
    }
  })
})

describe('checkbox look (BACKLOG 14, 11:08)', () => {
  it('unchecked boxes have their own background and border instead of the browser white square', () => {
    const m = css.match(/input\[type='checkbox'\]\s*\{[^}]*appearance:\s*none[^}]*\}/)
    expect(m).not.toBeNull()
    expect(m![0]).toContain('border: 1.5px solid var(--text-dim)')
    expect(m![0]).toContain('background-color: var(--bg)')
  })
  it('checked boxes fill with the theme accent', () => {
    const m = css.match(/input\[type='checkbox'\]:checked\s*\{([^}]*)\}/)
    expect(m).not.toBeNull()
    expect(m![1]).toContain('background-color: var(--accent)')
  })
})
