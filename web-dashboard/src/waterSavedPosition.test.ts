import { describe, expect, it } from 'vitest'
import anim from './components/WaterSavedAnim.vue?raw'
import modal from './components/WaterModal.vue?raw'

// 🐞 BACKLOG раздел 30: «анимация, как стакан наполняется, когда делаешь +200 / +1000 — теперь в нём вода не появляется».
// Причина: оверлей анимации был position:absolute внутри окна воды (max-height 85vh, overflow-y:auto). Окно выросло (журнал, правка суммы,
// рост) и прокручивается; оверлей оставался в верхней части прокручиваемой области, и при нажатии кнопок ниже стакан был за пределами видимого.
// Теперь оверлей — fixed по центру экрана, над затемнением окна, и не перехватывает нажатия.
const css = anim.slice(anim.indexOf('<style'))
const rule = (sel: string): string => {
  const m = css.match(new RegExp(`${sel.replace('.', '\\.')}\\s*\\{([^}]*)\\}`))
  expect(m, sel).not.toBeNull()
  return m![1]
}

describe('анимация «записалось» (стакан наполняется): оверлей виден при любой прокрутке окна', () => {
  it('оверлей закреплён за экраном (fixed), а не за прокручиваемым окном (absolute)', () => {
    const r = rule('.water-saved')
    expect(r).toMatch(/position:\s*fixed/)
    expect(r).not.toMatch(/position:\s*absolute/)
    expect(r).toMatch(/inset:\s*0/)
  })

  it('поверх затемнения окна (z-index > 50) и не перехватывает нажатия, пока играет', () => {
    const r = rule('.water-saved')
    const z = Number(r.match(/z-index:\s*(\d+)/)![1])
    expect(z).toBeGreaterThan(50)
    expect(r).toMatch(/pointer-events:\s*none/)
  })

  it('сама анимация заливки на месте: вода поднимается, галочка дорисовывается', () => {
    expect(css).toMatch(/@keyframes water-saved-rise/)
    expect(css).toMatch(/\.water-saved-fill\s*\{[^}]*animation:\s*water-saved-rise/)
    expect(css).toMatch(/\.water-saved-check\s*\{[^}]*animation:\s*water-saved-draw/)
    expect(anim).toContain('var(--water-bottom)')
  })

  it('окно воды по-прежнему подключает анимацию и отдаёт ей tick', () => {
    expect(modal).toContain('<WaterSavedAnim :tick="savedTick ?? 0" />')
  })

  it('при «Отключить все анимации» вода сразу на итоговом уровне, а галочка видна (как в шапке)', () => {
    expect(css).toMatch(/html\[data-motion='off'\] \.water-saved-fill\s*\{[^}]*translateY\(12%\)/)
    expect(css).toMatch(/html\[data-motion='off'\] \.water-saved-check\s*\{[^}]*stroke-dashoffset:\s*0/)
  })
})
