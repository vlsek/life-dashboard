import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в headerEmoji.test.ts).
import { readFileSync } from 'node:fs'
import WaterGlass from './components/WaterGlass.vue'

// BACKLOG 113 «Состояние 100%» (остаток после v2.21): глобальный стакан шапки золотой при ≥100% нормы, как стакан Дашборда.
const css: string = readFileSync('src/header.css', 'utf-8')
const glass = (todayMl: number) => mount(WaterGlass, { props: { todayMl, normMl: 2000, title: 't' } })

describe('стакан шапки: состояние 100%', () => {
  it('ниже нормы: серый контур, без золотого класса и блика', () => {
    const w = glass(1500)
    expect(w.find('svg').classes()).not.toContain('gh-glass-full')
    expect(w.find('[data-test="glass-sheen"]').exists()).toBe(false)
    expect(w.find('[data-test="glass-outline"]').attributes('style')).toContain('--text-dim')
  })

  it('100% и перевыполнение: золотой контур и эллипс, класс свечения, блик', () => {
    for (const ml of [2000, 2600]) {
      const w = glass(ml)
      expect(w.find('svg').classes()).toContain('gh-glass-full')
      expect(w.find('[data-test="glass-sheen"]').exists()).toBe(true)
      expect(w.find('[data-test="glass-outline"]').attributes('style')).toContain('--water-gold')
      expect(w.find('ellipse').attributes('style')).toContain('--water-gold')
    }
  })

  it('упало ниже нормы — золото снимается', async () => {
    const w = glass(2000)
    await w.setProps({ todayMl: 1800 })
    expect(w.find('svg').classes()).not.toContain('gh-glass-full')
    expect(w.find('[data-test="glass-sheen"]').exists()).toBe(false)
  })

  it('подпись и клик не изменились: кнопка с title, клик наружу', async () => {
    const w = glass(2000)
    expect(w.find('[data-test="water-badge"]').attributes('title')).toBe('t')
    await w.find('[data-test="water-badge"]').trigger('click')
    expect(w.emitted('click')).toHaveLength(1)
  })
})

describe('стили золотого стакана шапки', () => {
  it('токен --water-gold задан для всех четырёх тем и по умолчанию', () => {
    expect(css).toMatch(/html\.theme-dark \.gh-root, html\.theme-monet \.gh-root \{ --water-gold: #[0-9a-f]{6}/i)
    expect(css).toMatch(/html\.theme-light \.gh-root, html\.theme-pink \.gh-root \{ --water-gold: #[0-9a-f]{6}/i)
    expect(css).toMatch(/^\.gh-root \{ --water-gold: #[0-9a-f]{6}/im)
  })

  it('блик и свечение гаснут при «уменьшить движение» и при «отключить все анимации»', () => {
    expect(css).toContain('@keyframes gh-water-sheen')
    expect(css).toContain('@keyframes gh-water-glow')
    expect(css).toMatch(/prefers-reduced-motion: reduce\) \{ \.gh-glass-full, \.gh-glass-sheen \{ animation: none !important/)
    expect(css).toMatch(/html\[data-motion="off"\] \.gh-root \*[^{]*\{ animation: none !important/)
    expect(css).toContain('html[data-motion="off"] .gh-glass-sheen { opacity: 0; }')
  })
})
