import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// BACKLOG 64.1, срез 3: экран слота — «Все · Мои · Магазин», поиск, сортировка, плоский список с редкостью на карточке.
const h = vi.hoisted(() => ({ total: 250, owned: [] as any[], ach: [] as { key: string }[] }))
vi.mock('./lib/supabase', () => {
  const chain = (table: string) => {
    const c: any = {
      select: () => c,
      eq: () => c,
      maybeSingle: () => Promise.resolve({ data: table === 'profiles' ? { onboarded: true, customization: {} } : null, error: null }),
      insert: () => Promise.resolve({ error: null }),
      upsert: () => Promise.resolve({ error: null }),
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      delete: () => ({ eq: () => ({ eq: () => Promise.resolve({ error: null }) }) }),
      then: (res: (v: unknown) => unknown) => Promise.resolve({ data: table === 'user_customizations' ? h.owned : table === 'user_achievements' ? h.ach : [], error: null }).then(res),
    }
    return c
  }
  return {
    sb: { auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'u1', email: 'a@b.c' } } } }) }, from: chain, rpc: () => Promise.resolve({ data: [{ user_id: 'u1', total_points: h.total }], error: null }) },
    logout: vi.fn(),
  }
})
import App from './App.vue'
import { ITEMS } from './lib/customization'
import { RARITIES } from './lib/rarity'

const frames = ITEMS.filter((i) => i.category === 'avatar_frame')
const ownedFrame = frames.find((i) => i.source === 'points')!

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  localStorage.setItem('site_theme', 'dark')
  document.documentElement.className = 'theme-dark'
  history.replaceState(null, '', location.pathname)
  h.total = 100000
  h.owned = [{ item_key: ownedFrame.key }]
  h.ach = []
  globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ version: '1.00', en: [], ru: [] }))) as unknown as typeof fetch
})

async function openSlot(id: string) {
  location.hash = '#slot=' + id
  const w = mount(App, { attachTo: document.body })
  await flushPromises()
  await flushPromises()
  return w
}
const keysIn = (w: ReturnType<typeof mount>) => w.findAll('[data-testid="slot-grid"] [data-rarity]').map((e) => e.attributes('data-testid')!.replace('item-', ''))

describe('слот с предметами: панель и плоский список', () => {
  it('панель есть: три режима с числами, поиск, сортировка; редких групп-заголовков нет, на карточке — подпись редкости', async () => {
    const w = await openSlot('avatar_frame')
    expect(w.find('[data-testid="slot-toolbar"]').exists()).toBe(true)
    for (const m of ['all', 'mine', 'shop']) expect(w.find(`[data-testid="slot-mode-${m}"]`).exists(), m).toBe(true)
    expect(w.find('[data-testid="slot-mode-all"]').text()).toContain(String(frames.length))
    expect(w.find('[data-testid="slot-mode-mine"]').text()).toContain('1')
    expect(w.findAll('[data-testid^="rarity-"][data-rarity]').length).toBe(0) // групп редкости нет
    expect(w.findAll('[data-testid="item-rarity"]').length).toBe(frames.length)
    expect(keysIn(w).length).toBe(frames.length)
    w.unmount()
  })
  it('по умолчанию «Все» и сортировка по редкости: от обычных к легендарным', async () => {
    const w = await openSlot('avatar_frame')
    expect(w.find('[data-testid="slot-mode-all"]').attributes('aria-checked')).toBe('true')
    const ranks = w.findAll('[data-testid="slot-grid"] [data-rarity]').map((e) => RARITIES.indexOf(e.attributes('data-rarity') as never))
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b))
    w.unmount()
  })
  it('«Мои» — только полученное; «Магазин» — остальное; «Все» возвращает всё', async () => {
    const w = await openSlot('avatar_frame')
    await w.find('[data-testid="slot-mode-mine"]').trigger('click')
    expect(keysIn(w)).toEqual([ownedFrame.key])
    await w.find('[data-testid="slot-mode-shop"]').trigger('click')
    const shop = keysIn(w)
    expect(shop).not.toContain(ownedFrame.key)
    expect(shop.length).toBe(frames.length - 1)
    await w.find('[data-testid="slot-mode-all"]').trigger('click')
    expect(keysIn(w).length).toBe(frames.length)
    w.unmount()
  })
  it('поиск по названию сужает список; пустой результат — понятное сообщение', async () => {
    const w = await openSlot('avatar_frame')
    const first = frames[0]
    const name = w.find(`[data-testid="item-${first.key}"] p`).text()
    await w.find('[data-testid="slot-search"]').setValue(name.slice(0, 4).toUpperCase())
    expect(keysIn(w)).toContain(first.key)
    expect(keysIn(w).length).toBeLessThan(frames.length)
    await w.find('[data-testid="slot-search"]').setValue('zzzzzz-нет-такого')
    expect(keysIn(w)).toEqual([])
    expect(w.find('[data-testid="slot-empty"]').exists()).toBe(true)
    await w.find('[data-testid="slot-search"]').setValue('')
    expect(w.find('[data-testid="slot-empty"]').exists()).toBe(false)
    w.unmount()
  })
  it('сортировка «По названию» и «По цене» меняют порядок; у слота предметов есть «По цене»', async () => {
    const w = await openSlot('avatar_frame')
    const opts = w.findAll('[data-testid="slot-sort"] option').map((o) => o.attributes('value'))
    expect(opts).toEqual(['rarity', 'price', 'name'])
    const byRarity = keysIn(w)
    await w.find('[data-testid="slot-sort"]').setValue('name')
    const byName = keysIn(w)
    expect(byName.length).toBe(byRarity.length)
    expect(byName).not.toEqual(byRarity)
    w.unmount()
  })
  it('слот открывается с чистого листа: фильтр «Мои» из прошлого слота не прячет предметы', async () => {
    localStorage.setItem('cust_visibility', JSON.stringify({ owned: true, achievement: false, coins: false }))
    const w = await openSlot('avatar_frame')
    expect(w.find('[data-testid="slot-mode-all"]').attributes('aria-checked')).toBe('true')
    expect(keysIn(w).length).toBe(frames.length)
    w.unmount()
  })
})

describe('темы, «бесплатные» слоты и «всё одним списком»', () => {
  it('темы: тот же экран (режимы, поиск), без «По цене»', async () => {
    const w = await openSlot('themes')
    expect(w.find('[data-testid="slot-toolbar"]').exists()).toBe(true)
    expect(w.findAll('[data-testid="slot-sort"] option').map((o) => o.attributes('value'))).toEqual(['rarity', 'name'])
    expect(w.findAll('[data-testid="slot-grid"] [data-testid="item-rarity"]').length).toBeGreaterThan(10)
    await w.find('[data-testid="slot-search"]').setValue('zzzzzz-нет-такой')
    expect(w.find('[data-testid="slot-empty"]').exists()).toBe(true)
    w.unmount()
  })
  it('«бесплатный» слот: панели нет (всё уже у человека)', async () => {
    const w = await openSlot('splash')
    expect(w.find('[data-testid="slot-toolbar"]').exists()).toBe(false)
    expect(w.find('#sg-splash').exists()).toBe(true)
    w.unmount()
  })
  it('«Всё одним списком»: прежняя лента с группами редкости и чипами «Показывать»', async () => {
    const w = await openSlot('all')
    expect(w.find('[data-testid="slot-toolbar"]').exists()).toBe(false)
    expect(w.findAll('[data-testid^="rarity-"]').length).toBeGreaterThan(0)
    expect(w.find('[data-testid="visibility"]').exists()).toBe(true)
    expect(w.find('[data-testid="vis-owned"]').exists()).toBe(true)
    w.unmount()
  })
})
