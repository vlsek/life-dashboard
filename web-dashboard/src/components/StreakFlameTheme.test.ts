// @ts-ignore — в проекте нет типов node, а vitest выполняется в node; ?raw для .css в vitest отдаёт пустую строку.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// happy-dom не считает стили из .css, поэтому проверяем сам источник: правило контура огня
// для темы Monet (BACKLOG 1.1) не должно потеряться при правках style.css.
describe('streak flame in the Monet theme', () => {
  const css: string = readFileSync('src/style.css', 'utf-8') // vitest запускается из папки web-dashboard/
  it('has an accent outline rule for .fl-outer under html.theme-monet', () => {
    const m = css.match(/html\.theme-monet \.streak-flame \.fl-outer\s*\{([^}]*)\}/)
    expect(m).not.toBeNull()
    expect(m![1]).toContain('stroke: var(--accent)')
    expect(m![1]).toMatch(/stroke-width:\s*0\.6/)
  })
})
