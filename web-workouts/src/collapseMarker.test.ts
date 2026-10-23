import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CollapseChevron from './components/CollapseChevron.vue'
import { collapseStyle } from './lib/useCollapseStyle'

// Вид маркера сворачивания (товары «Плюс/минус» и «Треугольник»): базовый — шеврон-стрелка.
describe('CollapseChevron: вид маркера', () => {
  it('базовый — стрелка', () => {
    collapseStyle.value = 'chevron'
    expect(mount(CollapseChevron, { props: { collapsed: true } }).find('path').attributes('d')).toBe('M6 9l6 6 6-6')
  })
  it('плюс/минус: у свёрнутого плюс (2 штриха), у раскрытого минус (1)', () => {
    collapseStyle.value = 'plus'
    expect(mount(CollapseChevron, { props: { collapsed: true } }).findAll('path')).toHaveLength(2)
    expect(mount(CollapseChevron, { props: { collapsed: false } }).findAll('path')).toHaveLength(1)
  })
  it('треугольник: закрашенный', () => {
    collapseStyle.value = 'caret'
    expect(mount(CollapseChevron, { props: { collapsed: false } }).find('path').attributes('fill')).toBe('currentColor')
    collapseStyle.value = 'chevron'
  })
  it('точка: закрашена у раскрытого блока, кольцо у свёрнутого', () => {
    collapseStyle.value = 'dot'
    expect(mount(CollapseChevron, { props: { collapsed: false } }).find('circle').attributes('fill')).toBe('currentColor')
    expect(mount(CollapseChevron, { props: { collapsed: true } }).find('circle').attributes('fill')).toBe('none')
    collapseStyle.value = 'chevron'
  })
  it('квадрат: закрашен у раскрытого, контур у свёрнутого', () => {
    collapseStyle.value = 'square'
    expect(mount(CollapseChevron, { props: { collapsed: false } }).find('rect').attributes('fill')).toBe('currentColor')
    expect(mount(CollapseChevron, { props: { collapsed: true } }).find('rect').attributes('fill')).toBe('none')
    collapseStyle.value = 'chevron'
  })
  it('гамбургер: две полоски у раскрытого, три у свёрнутого', () => {
    collapseStyle.value = 'burger'
    expect(mount(CollapseChevron, { props: { collapsed: false } }).findAll('path')).toHaveLength(2)
    expect(mount(CollapseChevron, { props: { collapsed: true } }).findAll('path')).toHaveLength(3)
    collapseStyle.value = 'chevron'
  })
  it('длинная стрелка: один штрих-путь со стержнем', () => {
    collapseStyle.value = 'arrow'
    expect(mount(CollapseChevron, { props: { collapsed: false } }).find('path').attributes('d')).toContain('v14')
    collapseStyle.value = 'chevron'
  })
  it('кольцо: точка внутри только у свёрнутого блока', () => {
    collapseStyle.value = 'ring'
    expect(mount(CollapseChevron, { props: { collapsed: false } }).findAll('circle')).toHaveLength(1)
    expect(mount(CollapseChevron, { props: { collapsed: true } }).findAll('circle')).toHaveLength(2)
    collapseStyle.value = 'chevron'
  })
  it('ромб и звезда: закрашены у раскрытого, контур у свёрнутого, без поворота', () => {
    for (const st of ['diamond', 'star'] as const) {
      collapseStyle.value = st
      expect(mount(CollapseChevron, { props: { collapsed: false } }).find('path').attributes('fill')).toBe('currentColor')
      const w = mount(CollapseChevron, { props: { collapsed: true } })
      expect(w.find('path').attributes('fill')).toBe('none')
      expect(w.find('svg').attributes('data-marker')).toBe(st)
    }
    collapseStyle.value = 'chevron'
  })
  it('двойная стрелка: два штриха', () => {
    collapseStyle.value = 'double'
    expect(mount(CollapseChevron, { props: { collapsed: false } }).findAll('path')).toHaveLength(2)
    collapseStyle.value = 'chevron'
  })
})
