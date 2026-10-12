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
})
