import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// Виджет «Коплю на товар» (BACKLOG «Виджет «коплю на товар»», одобрено владельцем 2026-10-03)
const db = vi.hoisted(() => ({
  open: { data: [] as unknown[], error: null as unknown },
  single: { data: null as unknown, error: null as unknown },
  balance: { ok: true, balance: 0 } as { ok: boolean; balance?: number; error?: string },
}))
vi.mock('./supabase', () => {
  const chain: Record<string, unknown> = {}
  chain.select = () => chain
  chain.eq = () => chain
  chain.order = () => Promise.resolve(db.open)
  chain.maybeSingle = () => Promise.resolve(db.single)
  return { sb: { from: () => chain } }
})
vi.mock('./loadBalance', () => ({ loadBalance: vi.fn(() => Promise.resolve(db.balance)) }))

import SavingsWidget from '../components/SavingsWidget.vue'
import WidgetsSection from '../components/WidgetsSection.vue'
import { itemProgress, loadOpenShopItems } from './savingsWidget'

const row = (over: Record<string, unknown> = {}) => ({ id: 'i1', name: 'Наушники', cost: 100, link: null, redeemed: false, ...over })

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  db.open = { data: [], error: null }
  db.single = { data: row(), error: null }
  db.balance = { ok: true, balance: 30 }
})

describe('itemProgress (копия правила магазина)', () => {
  it('процент вниз, 99 пока не хватает, 100 когда хватает; недостающие баллы', () => {
    expect(itemProgress(100, 30)).toEqual({ pct: 30, canBuy: false, missing: 70 })
    expect(itemProgress(100, 99.9)).toMatchObject({ pct: 99, canBuy: false })
    expect(itemProgress(100, 99.9).missing).toBeCloseTo(0.1, 5)
    expect(itemProgress(100, 100)).toEqual({ pct: 100, canBuy: true, missing: 0 })
    expect(itemProgress(100, 250)).toEqual({ pct: 100, canBuy: true, missing: 0 })
  })
  it('отрицательный баланс считается нулём; цена 0 — можно брать', () => {
    expect(itemProgress(100, -5)).toEqual({ pct: 0, canBuy: false, missing: 100 })
    expect(itemProgress(0, 0)).toEqual({ pct: 100, canBuy: true, missing: 0 })
  })
})

describe('loadOpenShopItems', () => {
  it('отдаёт не купленные товары в виде id/название/цена/ссылка; цена null → 0', async () => {
    db.open = { data: [row(), row({ id: 'i2', name: 'Книга', cost: null, link: 'https://x.y' })], error: null }
    expect(await loadOpenShopItems('u1')).toEqual([
      { id: 'i1', name: 'Наушники', cost: 100, link: null },
      { id: 'i2', name: 'Книга', cost: 0, link: 'https://x.y' },
    ])
  })
  it('ошибка запроса → пустой список, окно не ломается', async () => {
    db.open = { data: [], error: { message: 'boom' } }
    expect(await loadOpenShopItems('u1')).toEqual([])
  })
})

describe('SavingsWidget', () => {
  it('товар, полоса «баллы / цена», сколько не хватает, ссылка в магазин; состояние ready наверх', async () => {
    const w = mount(SavingsWidget, { props: { userId: 'u1', itemId: 'i1' } })
    await flushPromises()
    expect(w.find('[data-test="savings-name"]').text()).toBe('Наушники')
    expect(w.find('[data-test="savings-numbers"]').text()).toBe('30 / 100')
    expect(w.find('[data-test="savings-bar"]').attributes('aria-valuenow')).toBe('30')
    expect(w.find('[data-test="savings-fill"]').attributes('style')).toContain('width: 30%')
    expect(w.find('[data-test="savings-note"]').text()).toBe('Не хватает 70 баллов')
    expect(w.find('[data-test="savings-shop-link"]').attributes('href')).toBe('/shop/')
    expect(w.emitted('state')!.map((e) => e[0])).toEqual(['loading', 'ready'])
    w.unmount()
  })

  it('баллов хватает — полная полоса и надпись «можно покупать»', async () => {
    db.balance = { ok: true, balance: 140 }
    const w = mount(SavingsWidget, { props: { userId: 'u1', itemId: 'i1' } })
    await flushPromises()
    expect(w.find('[data-test="savings-fill"]').attributes('style')).toContain('width: 100%')
    expect(w.find('[data-test="savings-note"]').text()).toContain('можно покупать')
    w.unmount()
  })

  it('товар куплен или удалён — виджета нет (empty), ничего не рисуется', async () => {
    db.single = { data: row({ redeemed: true }), error: null }
    let w = mount(SavingsWidget, { props: { userId: 'u1', itemId: 'i1' } })
    await flushPromises()
    expect(w.find('[data-test="savings-widget"]').exists()).toBe(false)
    expect(w.emitted('state')!.map((e) => e[0]).pop()).toBe('empty')
    w.unmount()
    db.single = { data: null, error: null }
    w = mount(SavingsWidget, { props: { userId: 'u1', itemId: 'gone' } })
    await flushPromises()
    expect(w.find('[data-test="savings-widget"]').exists()).toBe(false)
    expect(w.emitted('state')!.map((e) => e[0]).pop()).toBe('empty')
    w.unmount()
  })

  it('ошибка баланса или товара — состояние error, без падения', async () => {
    db.balance = { ok: false, error: 'нет сети' }
    let w = mount(SavingsWidget, { props: { userId: 'u1', itemId: 'i1' } })
    await flushPromises()
    expect(w.find('[data-test="savings-widget"]').exists()).toBe(false)
    expect(w.emitted('state')!.map((e) => e[0]).pop()).toBe('error')
    w.unmount()
    db.balance = { ok: true, balance: 1 }
    db.single = { data: null, error: { message: 'rls' } }
    w = mount(SavingsWidget, { props: { userId: 'u1', itemId: 'i1' } })
    await flushPromises()
    expect(w.emitted('state')!.map((e) => e[0]).pop()).toBe('error')
    w.unmount()
  })
})

describe('WidgetsSection', () => {
  it('блок виден и сообщает shown=true, когда виджет готов; заголовок «Виджеты»', async () => {
    const w = mount(WidgetsSection, { props: { userId: 'u1', config: { savings: 'i1' } } })
    await flushPromises()
    expect(w.find('[data-test="widgets-section"]').attributes('style') ?? '').not.toContain('display: none')
    expect(w.text()).toContain('Виджеты')
    expect(w.emitted('shown')!.map((e) => e[0]).pop()).toBe(true)
    w.unmount()
  })

  it('товар куплен — блока нет вообще (скрыт, shown=false); при размонтировании тоже shown=false', async () => {
    db.single = { data: row({ redeemed: true }), error: null }
    const w = mount(WidgetsSection, { props: { userId: 'u1', config: { savings: 'i1' } } })
    await flushPromises()
    expect(w.find('[data-test="widgets-section"]').attributes('style')).toContain('display: none')
    expect(w.emitted('shown')!.map((e) => e[0]).pop()).toBe(false)
    db.single = { data: row(), error: null }
    const w2 = mount(WidgetsSection, { props: { userId: 'u1', config: { savings: 'i1' } } })
    await flushPromises()
    w2.unmount()
    expect(w2.emitted('shown')!.map((e) => e[0]).pop()).toBe(false)
    w.unmount()
  })

  it('слот ручки перетаскивания попадает в заголовок', async () => {
    const w = mount(WidgetsSection, { props: { userId: 'u1', config: { savings: 'i1' } }, slots: { actions: '<button data-test="h">☰</button>' } })
    await flushPromises()
    expect(w.find('[data-test="h"]').exists()).toBe(true)
    w.unmount()
  })
})
