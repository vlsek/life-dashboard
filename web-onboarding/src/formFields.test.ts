import { describe, expect, it } from 'vitest'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в других стражах).
import { readFileSync } from 'node:fs'
const css: string = readFileSync('src/style.css', 'utf-8')

// Tailwind preflight обнуляет рамку у полей: без базового правила имя, дата, рост и вес выглядят как голый текст.
describe('поля формы онбординга', () => {
  it('у текстовых полей есть рамка, фон и фокус-кольцо', () => {
    const i = css.indexOf('/* form-fields')
    expect(i).toBeGreaterThan(-1)
    const block = css.slice(i, css.indexOf('/* date-time-fields */'))
    expect(block).toContain("input:not([type='checkbox'])")
    expect(block).toMatch(/border:\s*1px solid var\(--border\)/)
    expect(block).toMatch(/:focus/)
    expect(block).toMatch(/min-height:\s*44px/)
  })
})
