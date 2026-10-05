import { describe, expect, it } from 'vitest'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в других стражах пилота).
import { readFileSync } from 'node:fs'

// 🐞 BACKLOG раздел 30 (копия стража из Дашборда): оверлей анимации «записалось» в окне воды шапки — fixed по центру экрана,
// иначе при прокрутке окна к «+200 / +1000» стакан с анимацией оказывался за пределами видимого.
const css: string = readFileSync('src/header.css', 'utf-8')
const m = css.match(/\.water-saved\s*\{([^}]*)\}/)

describe('шапка: анимация «записалось» видна при любой прокрутке окна воды', () => {
  it('правило .water-saved есть и закрепляет оверлей за экраном', () => {
    expect(m).not.toBeNull()
    expect(m![1]).toMatch(/position:\s*fixed/)
    expect(m![1]).not.toMatch(/position:\s*absolute/)
    expect(m![1]).toMatch(/inset:\s*0/)
  })

  it('выше затемнения окон (.gh-backdrop — 2000) и не перехватывает нажатия (класса pointer-events-none в бандле шапки нет)', () => {
    const z = Number(m![1].match(/z-index:\s*(\d+)/)![1])
    const backdrop = Number(css.match(/\.gh-backdrop\s*\{[^}]*z-index:\s*(\d+)/)![1])
    expect(z).toBeGreaterThan(backdrop)
    expect(m![1]).toMatch(/pointer-events:\s*none/)
  })

  it('заливка и галочка анимируются, а при выключенных анимациях показываются сразу', () => {
    expect(css).toMatch(/\.water-saved-fill\s*\{[^}]*animation:\s*water-saved-rise/)
    expect(css).toMatch(/html\[data-motion="off"\] \.water-saved-fill/)
  })
})
