import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import type { ShopItem } from './lib/types'

const item = (id: string, cost: number, over: Partial<ShopItem> = {}): ShopItem => ({
  id, user_id: 'u', name: id, link: null, cost, image_url: null, redeemed: false, redeemed_date: null, ...over,
})

const h = vi.hoisted(() => ({ buyItem: vi.fn(), deleteItem: vi.fn(), state: null as any }))

vi.mock('./lib/useShop', () => ({
  useShop: () => h.state,
}))

import App from './App.vue'

function setup(balance: number | null = 300, items?: ShopItem[]) {
  h.state = {
    auth: ref({ status: 'ready', userId: 'u', userEmail: 'a@b.c' }),
    items: ref(
      items ?? [
        item('coffee', 50, { redeemed: true, redeemed_date: '2026-09-28' }),
        item('movie', 150),
        item('book', 300),
        item('shoes', 800),
      ],
    ),
    balance: ref(balance === null ? null : { total: balance + 100, spent: 100, balance }),
    error: ref(null),
    init: vi.fn(),
    addItem: vi.fn(),
    updateItem: vi.fn(),
    buyItem: h.buyItem,
    deleteItem: h.deleteItem,
    uploadImage: vi.fn(),
  }
  return mount(App, { attachTo: document.body })
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  h.buyItem.mockReset()
  h.deleteItem.mockReset()
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

describe('Магазин — вид «Витрина» (по умолчанию)', () => {
  it('shows the grid with chips and counts, balance card in showcase form', () => {
    const w = setup()
    expect(w.find('[data-testid="grid-view"]').exists()).toBe(true)
    expect(w.find('[data-testid="list-view"]').exists()).toBe(false)
    expect(w.findAll('[data-testid="shop-card"]')).toHaveLength(4)
    const chips = w.findAll('[data-testid="shop-filters"] button').map((b) => b.text())
    expect(chips).toEqual(['Все 4', 'Можно купить 2', 'Копится 1', 'Мои покупки 1'])
    expect(w.find('[data-testid="balance-value"]').text()).toContain('300')
    expect(w.find('[data-testid="goal-bar"]').exists()).toBe(false)
  })
  it('filters cards by chip; empty filter shows a message', async () => {
    const w = setup()
    await w.find('[data-filter="affordable"]').trigger('click')
    expect(w.findAll('[data-testid="shop-card"]').map((c) => c.text()).join(' ')).toContain('movie')
    expect(w.findAll('[data-testid="shop-card"]')).toHaveLength(2)
    await w.find('[data-filter="bought"]').trigger('click')
    expect(w.findAll('[data-testid="shop-card"]')).toHaveLength(1)
    const w2 = setup(0, [item('movie', 150)])
    await w2.find('[data-filter="affordable"]').trigger('click')
    expect(w2.find('[data-testid="empty-filter"]').text()).toContain('копите дальше')
  })
  it('buy on an affordable card calls buyItem with its id; unaffordable shows the shortfall', async () => {
    const w = setup()
    const cards = w.findAll('[data-testid="shop-card"]')
    const movie = cards.find((c) => c.text().includes('movie'))!
    await movie.find('[data-testid="buy-btn"]').trigger('click')
    expect(h.buyItem).toHaveBeenCalledWith('movie')
    const shoes = cards.find((c) => c.text().includes('shoes'))!
    expect(shoes.find('[data-testid="buy-btn"]').exists()).toBe(false)
    expect(shoes.text()).toContain('Не хватает 500')
  })
})

describe('Магазин — вид «Список с копилкой»', () => {
  it('switching to the list shows sections, the savings goal bar and remembers the choice', async () => {
    const w = setup()
    await w.find('[data-view="list"]').trigger('click')
    expect(w.find('[data-testid="list-view"]').exists()).toBe(true)
    expect(w.find('[data-testid="grid-view"]').exists()).toBe(false)
    expect(localStorage.getItem('shop_view')).toBe('list')
    expect(w.find('[data-testid="section-affordable"]').findAll('[data-testid="shop-row"]')).toHaveLength(2)
    expect(w.find('[data-testid="section-saving"]').findAll('[data-testid="shop-row"]')).toHaveLength(1)
    expect(w.find('[data-testid="goal-label"]').text()).toBe('Копите на: shoes, 800')
    expect(w.find('[data-testid="goal-bar"]').attributes('aria-valuenow')).toBe('37') // 300 из 800
    expect(w.find('[data-testid="row-left"]').text()).toBe('ещё 500')
  })
  it('opens in the list when it was chosen last time', () => {
    localStorage.setItem('shop_view', 'list')
    const w = setup()
    expect(w.find('[data-testid="list-view"]').exists()).toBe(true)
    expect(w.find('[data-view="list"]').attributes('aria-checked')).toBe('true')
  })
  it('purchases are collapsed until the toggle is pressed', async () => {
    localStorage.setItem('shop_view', 'list')
    const w = setup()
    const sec = w.find('[data-testid="section-bought"]')
    expect(sec.text()).toContain('Мои покупки (1)')
    expect(sec.findAll('[data-testid="shop-row"]')).toHaveLength(0)
    await w.find('[data-testid="bought-toggle"]').trigger('click')
    expect(sec.findAll('[data-testid="shop-row"]')).toHaveLength(1)
    expect(sec.text()).toContain('28.09.2026')
  })
  it('no goal and no goal bar when everything is affordable; buy works from a row', async () => {
    localStorage.setItem('shop_view', 'list')
    const w = setup(5000)
    expect(w.find('[data-testid="goal-label"]').exists()).toBe(false)
    expect(w.find('[data-testid="section-saving"]').exists()).toBe(false)
    await w.findAll('[data-testid="buy-btn"]')[0].trigger('click')
    expect(h.buyItem).toHaveBeenCalledWith('movie')
  })
  it('edit and delete work in both views (delete asks for confirmation in the site-styled dialog, not the native one)', async () => {
    const nativeConfirm = vi.fn(() => true)
    vi.stubGlobal('confirm', nativeConfirm)
    const w = setup()
    // подтвердили → удалено
    await w.findAll('[data-testid="delete-btn"]')[0].trigger('click')
    expect(w.find('[data-test="confirm-dialog-text"]').text()).toBe('Удалить эту позицию?')
    expect(h.deleteItem).not.toHaveBeenCalled() // пока человек не ответил — ничего не удалено
    await w.find('[data-test="confirm-dialog-ok"]').trigger('click')
    await flushPromises()
    expect(h.deleteItem).toHaveBeenCalledTimes(1)
    // отменили → не удалено
    h.deleteItem.mockReset()
    await w.findAll('[data-testid="delete-btn"]')[0].trigger('click')
    await w.find('[data-test="confirm-dialog-cancel"]').trigger('click')
    await flushPromises()
    expect(h.deleteItem).not.toHaveBeenCalled()
    // то же в виде «Список с копилкой»
    await w.find('[data-view="list"]').trigger('click')
    await w.findAll('[data-testid="delete-btn"]')[0].trigger('click')
    await w.find('[data-test="confirm-dialog-ok"]').trigger('click')
    await flushPromises()
    expect(h.deleteItem).toHaveBeenCalledTimes(1)
    expect(nativeConfirm).not.toHaveBeenCalled()
    w.unmount()
  })
})

describe('Магазин — пустые и загрузочные состояния', () => {
  it('empty shop shows the invitation text in both views; balance still loading shows the placeholder', async () => {
    const w = setup(300, [])
    expect(w.text()).toContain('Список пуст')
    await w.find('[data-view="list"]').trigger('click')
    expect(w.text()).toContain('Список пуст')
    const loading = setup(null)
    expect(loading.find('[data-testid="balance-card"]').text()).toContain('Загрузка')
  })
})
