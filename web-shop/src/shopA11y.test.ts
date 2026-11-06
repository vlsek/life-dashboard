import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ShopCard from './components/ShopCard.vue'
import ShopRow from './components/ShopRow.vue'
import type { ShopItem } from './lib/types'

// BACKLOG 72.5 срез 1 (проверка в настоящем браузере, scripts/shop_audit.py): кнопка удаления была без доступного имени, а длинное название без пробелов
// вылезало за карточку и раздвигало страницу. jsdom вёрстку не считает — здесь проверяются подпись и перенос слов как разметка;
// сама вёрстка проверяется браузерным скриптом.
const mk = (over: Partial<ShopItem> = {}): ShopItem => ({ id: 'x', user_id: 'u1', name: 'Кофе', link: null, cost: 8, archived: false, image_url: null, redeemed: false, redeemed_date: null, ...over }) as unknown as ShopItem

describe.each([['ShopCard', ShopCard], ['ShopRow', ShopRow]] as const)('%s: доступность', (_n, Comp) => {
  beforeEach(() => localStorage.setItem('site_lang', 'ru'))

  it('кнопка удаления и кнопка правки имеют подписи для скринридера', () => {
    const w = mount(Comp as unknown as typeof ShopCard, { props: { item: mk(), balance: 100 } })
    expect(w.get('[data-testid="delete-btn"]').attributes('aria-label')).toBe('Удалить товар')
    expect(w.get('[data-testid="edit-btn"]').attributes('aria-label')).toBe('Изменить товар')
  })
  it('подписи на английском', () => {
    localStorage.setItem('site_lang', 'en')
    const w = mount(Comp as unknown as typeof ShopCard, { props: { item: mk(), balance: 100 } })
    expect(w.get('[data-testid="delete-btn"]').attributes('aria-label')).toBe('Delete item')
  })
  it('нажатие на удаление по-прежнему отдаёт вещь', async () => {
    const item = mk()
    const w = mount(Comp as unknown as typeof ShopCard, { props: { item, balance: 100 } })
    await w.get('[data-testid="delete-btn"]').trigger('click')
    expect(w.emitted('remove')![0][0]).toEqual(item)
  })
})

describe('ShopCard: длинное название', () => {
  it('название переносится по любому символу, чтобы не раздвигать карточку и страницу', () => {
    const w = mount(ShopCard, { props: { item: mk({ name: 'Сверхдлинное_название_без_пробелов_'.repeat(4) }), balance: 100 } })
    expect(w.get('[data-testid="shop-card-name"]').attributes('style')).toContain('overflow-wrap: anywhere')
  })
})

describe('купленная вещь: читаемость (контраст)', () => {
  // Раньше карточка целиком была с opacity-70, а название ещё и с opacity-60: текст получался 2,4–3,5:1 (WCAG AA — 4,5:1). Отличие осталось: зачёркивание и подпись «Куплено».
  it('карточка не затемняется целиком, название зачёркнуто и лишь слегка приглушено', () => {
    const w = mount(ShopCard, { props: { item: mk({ redeemed: true, redeemed_date: '2026-10-01' }), balance: 100 } })
    expect(w.get('[data-testid="shop-card"]').classes()).not.toContain('opacity-70')
    const name = w.get('[data-testid="shop-card-name"]').classes()
    expect(name).toContain('line-through')
    expect(name).toContain('opacity-80')
    expect(name).not.toContain('opacity-60')
  })
  it('строка списка: то же приглушение названия', () => {
    const w = mount(ShopRow, { props: { item: mk({ redeemed: true, redeemed_date: '2026-10-01' }), balance: 100 } })
    const name = w.get('[data-testid="shop-row-name"]').classes()
    expect(name).toContain('line-through')
    expect(name).toContain('opacity-80')
    expect(name).not.toContain('opacity-60')
  })
  it('не купленная вещь без зачёркивания и приглушения', () => {
    const w = mount(ShopCard, { props: { item: mk(), balance: 100 } })
    expect(w.get('[data-testid="shop-card-name"]').classes()).not.toContain('line-through')
  })
})

