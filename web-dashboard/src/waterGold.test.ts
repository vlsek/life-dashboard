import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в StreakFlameTheme.test.ts).
import { readFileSync } from 'node:fs'
import WaterBadge from './components/WaterBadge.vue'

const css: string = readFileSync('src/style.css', 'utf-8')

beforeEach(() => localStorage.setItem('site_lang', 'ru'))

describe('стакан в шапке: состояние 100% (BACKLOG 💧 2.1)', () => {
  it('ниже нормы: серый контур, без блика и без золотого класса', () => {
    const w = mount(WaterBadge, { props: { currentMl: 1500, normMl: 2000 } })
    expect(w.find('[data-test="water-glass"]').classes()).not.toContain('water-glass-full')
    expect(w.find('[data-test="glass-sheen"]').exists()).toBe(false)
    expect(w.find('[data-test="glass-outline"]').attributes('style')).toContain('--text-dim')
  })

  it('ровно 100%: золотой контур, свечение (класс) и блик по воде', () => {
    const w = mount(WaterBadge, { props: { currentMl: 2000, normMl: 2000 } })
    expect(w.find('[data-test="water-glass"]').classes()).toContain('water-glass-full')
    expect(w.find('[data-test="glass-sheen"]').exists()).toBe(true)
    expect(w.find('[data-test="glass-outline"]').attributes('style')).toContain('--water-gold')
    expect(w.find('ellipse').attributes('style')).toContain('--water-gold')
  })

  it('перевыполнение (больше нормы) — то же золотое состояние', () => {
    const w = mount(WaterBadge, { props: { currentMl: 2600, normMl: 2000 } })
    expect(w.find('[data-test="glass-sheen"]').exists()).toBe(true)
  })

  it('вернулись ниже нормы (например, отменили добавление) — золото снимается', async () => {
    const w = mount(WaterBadge, { props: { currentMl: 2000, normMl: 2000 } })
    await w.setProps({ currentMl: 1800 })
    expect(w.find('[data-test="glass-sheen"]').exists()).toBe(false)
    expect(w.find('[data-test="water-glass"]').classes()).not.toContain('water-glass-full')
  })

  it('подпись «текущее / норма» и кнопка не изменились', () => {
    const w = mount(WaterBadge, { props: { currentMl: 2000, normMl: 2000 } })
    expect(w.text()).toContain('2000 / 2000 мл')
    expect(w.find('button').exists()).toBe(true)
  })
})

describe('стили золотого стакана', () => {
  it('токен --water-gold задан для каждой темы (тёмные — яркий, светлые — тёмно-золотой); группы селекторов генерирует apply_themes.py', () => {
    // селекторы тем идут группами через запятую, поэтому ищем «html.theme-<ключ>» где угодно в списке перед { ... }
    const gold = (k: string, hex: string) => new RegExp(`html\\.theme-${k}\\b[^{}]*\\{[^}]*--water-gold:\\s*${hex}`, 'i')
    for (const k of ['dark', 'monet']) expect(css, k).toMatch(gold(k, '#f0b429'))
    for (const k of ['light', 'pink']) expect(css, k).toMatch(gold(k, '#b87900'))
  })

  it('есть анимации блика и свечения, и они отключаются при «уменьшить движение»', () => {
    expect(css).toContain('@keyframes water-sheen')
    expect(css).toContain('@keyframes water-glow')
    expect(css).toMatch(/prefers-reduced-motion: reduce\)\s*\{\s*\.water-glass-full,\s*\.water-glass \.glass-sheen\s*\{\s*animation: none !important/)
  })

  it('«отключить все анимации» (общее правило) тоже гасит блик: оно действует на любые элементы под html[data-motion=off]', () => {
    expect(css).toMatch(/html\[data-motion='off'\] \*,/)
  })
})
