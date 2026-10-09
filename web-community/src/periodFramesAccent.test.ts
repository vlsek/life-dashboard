import { describe, expect, it } from 'vitest'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в motionAllPilots.test.ts).
import { readFileSync } from 'node:fs'

// BACKLOG раздел 33 (апд32): рамки выбора периода графика  — в цвете АКЦЕНТА темы,
// а не «чёрной» var(--border). Пилюля со стрелками (.date-stepper-pill) общая у DateStepper и PeriodPicker, поэтому красится сразу везде.
// Выбранный чип отличается от остальных заливкой и цветом текста (рамки у всех одного цвета).
const css: string = readFileSync('src/style.css', 'utf-8')

function rule(selector: string): string {
  const i = css.search(new RegExp('(^|\\n)' + selector.replace(/[.[\]()']/g, '\\$&') + '\\s*\\{'))
  expect(i, `нет правила ${selector}`).toBeGreaterThanOrEqual(0)
  return css.slice(i, css.indexOf('}', i) + 1)
}

describe('рамки выбора периода и даты — акцент темы', () => {
  it.each(['.date-stepper-pill', '.period-seg', '.period-chip'])('%s: рамка = var(--accent)', (sel) => {
    const body = rule(sel)
    expect(body).toMatch(/border:\s*1px solid var\(--accent\)/)
    expect(body).not.toMatch(/border:\s*1px solid var\(--border\)/)
  })

  it('выбранный чип: акцентный текст и заливка — отличим от невыбранных при одинаковых рамках', () => {
    const body = rule(".period-chip[aria-pressed='true']")
    expect(body).toMatch(/color:\s*var\(--accent\)/)
    expect(body).toMatch(/background:\s*color-mix\(in srgb, var\(--accent\)/)
  })
})
