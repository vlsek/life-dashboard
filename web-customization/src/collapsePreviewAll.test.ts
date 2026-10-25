import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ItemCard from './components/ItemCard.vue'
import { ITEMS } from './lib/customization'
import { parseCollapseStyle } from './lib/collapseStyle'

// У КАЖДОГО предмета «Вид сворачивания» своё превью (раньше неизвестный ключ тихо рисовался как «Аккордеон» — «Ромб» и «Стрелка в кружке»
// сначала показывались обычным шевроном). Превью = суффикс ключа; вид маркера из collapseStyle.ts должен совпадать с превью (кроме аккордеона и сводки,
// которые меняют поведение, а не маркер).
beforeEach(() => localStorage.setItem('site_lang', 'ru'))

const collapse = ITEMS.filter((i) => i.category === 'collapse_style')

describe('превью видов сворачивания', () => {
  it('предметов не меньше 12 (иначе страж ничего не проверяет)', () => {
    expect(collapse.length).toBeGreaterThanOrEqual(12)
  })
  it.each(collapse.map((i) => i.key))('%s: превью соответствует ключу', (key) => {
    const item = collapse.find((i) => i.key === key)!
    const w = mount(ItemCard, { props: { item, status: 'locked', balance: 1000, busy: false, disabled: false } as never })
    const variant = w.find('svg[data-variant]').attributes('data-variant')
    expect(variant).toBe(key.replace('collapse_', ''))
    // маркерные виды: то, что рисуют страницы, совпадает с превью
    if (!['accordion', 'summary'].includes(variant!)) expect(parseCollapseStyle(key)).toBe(variant)
  })
})
