import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// BACKLOG 64.1, срез 2: страница «Кастомизация» открывается витриной слотов (ячейки: что надето, n/m); слот открывается нажатием, «Назад» возвращает.
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
import { SLOTS } from './lib/slots'
import { SLOT_ALL, parseSlotHash, slotHash } from './lib/slotNav'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  localStorage.setItem('site_theme', 'dark')
  document.documentElement.className = 'theme-dark'
  history.replaceState(null, '', location.pathname)
  h.total = 250
  h.owned = []
  h.ach = []
  globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ version: '1.00', en: [], ru: [] }))) as unknown as typeof fetch
})

async function mountApp() {
  const w = mount(App, { attachTo: document.body })
  await flushPromises()
  await flushPromises()
  return w
}

describe('адрес витрины', () => {
  it('parseSlotHash: слот, «all», мусор и неизвестный слот → витрина', () => {
    expect(parseSlotHash('#slot=splash')).toBe('splash')
    expect(parseSlotHash('#slot=chart-markers')).toBe('chart-markers')
    expect(parseSlotHash('#slot=all')).toBe(SLOT_ALL)
    for (const bad of ['', '#', '#splash', '#slot=', '#slot=nope', '#slot=%E0%A4%A']) expect(() => parseSlotHash(bad)).not.toThrow()
    for (const bad of ['', '#', '#splash', '#slot=', '#slot=nope', '#slot=%E0%A4%A']) expect(parseSlotHash(bad), bad).toBe('')
  })
  it('slotHash и parseSlotHash — обратные друг другу для всех слотов', () => {
    for (const s of SLOTS) expect(parseSlotHash(slotHash(s.id)), s.id).toBe(s.id)
    expect(slotHash('')).toBe('')
  })
})

describe('витрина слотов на странице', () => {
  it('по умолчанию — ячейки всех слотов по группам, а самих разделов нет', async () => {
    const w = await mountApp()
    for (const s of SLOTS) expect(w.find(`[data-testid="slot-cell-${s.id}"]`).exists(), s.id).toBe(true)
    expect(w.findAll('[data-testid="slot-group-title"]').length).toBeGreaterThanOrEqual(4)
    expect(w.find('#sg-themes').exists()).toBe(false)
    expect(w.find('#sg-splash').exists()).toBe(false)
    expect(w.find('[data-testid="cust-tabs"]').exists()).toBe(false) // вкладок-групп больше нет
    w.unmount()
  })
  it('в каждой ячейке стоит «открыто/всего», у «бесплатных» — по реестру вариантов', async () => {
    const w = await mountApp()
    for (const s of SLOTS) expect(w.find(`[data-testid="slot-cell-${s.id}"] [data-testid="slot-count"]`).text(), s.id).toMatch(/^\d+\/\d+$/)
    w.unmount()
  })
  it('ячейка показывает, что надето: по умолчанию «По теме» без подсветки; своё значение из localStorage — с подсветкой', async () => {
    localStorage.setItem('chart_line', 'smooth')
    localStorage.setItem('chart_forecast', 'trend')
    const w = await mountApp()
    const splash = w.find('[data-testid="slot-cell-splash"]')
    expect(splash.find('[data-testid="slot-value"]').text()).toBe('По теме')
    expect(splash.attributes('data-custom')).toBe('false')
    const charts = w.find('[data-testid="slot-cell-chart-markers"]')
    expect(charts.attributes('data-custom')).toBe('true')
    expect(charts.find('[data-testid="slot-value"]').text()).toContain('Плавная')
    expect(charts.find('[data-testid="slot-value"]').text()).toContain('прогноз')
    w.unmount()
  })
})

describe('слот открывается и закрывается', () => {
  it('нажатие на ячейку открывает только этот слот (адрес #slot=…), «Назад» возвращает витрину', async () => {
    const w = await mountApp()
    await w.find('[data-testid="slot-cell-splash"]').trigger('click')
    await flushPromises()
    expect(location.hash).toBe('#slot=splash')
    expect(w.find('#sg-splash').exists()).toBe(true)
    expect(w.find('#sg-themes').exists()).toBe(false)
    expect(w.find('[data-testid="slot-title"]').text()).toContain('Заставка')
    expect(w.find('[data-testid="slot-cell-splash"]').exists()).toBe(false)
    await w.find('[data-testid="slot-back"]').trigger('click')
    await flushPromises()
    expect(location.hash).toBe('')
    expect(w.find('[data-testid="slot-cell-splash"]').exists()).toBe(true)
    expect(w.find('#sg-splash').exists()).toBe(false)
    w.unmount()
  })
  it('выбор внутри слота сразу виден в ячейке после «Назад»', async () => {
    const w = await mountApp()
    await w.find('[data-testid="slot-cell-splash"]').trigger('click')
    await flushPromises()
    await w.find('[data-testid="splash-orbit"] button').trigger('click')
    await flushPromises()
    await w.find('[data-testid="slot-back"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="slot-cell-splash"] [data-testid="slot-value"]').text()).not.toBe('По теме')
    expect(w.find('[data-testid="slot-cell-splash"]').attributes('data-custom')).toBe('true')
    w.unmount()
  })
  it('адрес #slot=water_glass открывает слот сразу (перезагрузка остаётся на месте); «Назад» браузера возвращает на витрину', async () => {
    location.hash = '#slot=water_glass'
    const w = await mountApp()
    expect(w.find('#sg-water_glass').exists()).toBe(true)
    expect(w.find('#sg-themes').exists()).toBe(false)
    history.pushState(null, '', location.pathname)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
    await flushPromises()
    expect(w.find('#sg-water_glass').exists()).toBe(false)
    expect(w.find('[data-testid="slot-cell-water_glass"]').exists()).toBe(true)
    w.unmount()
  })
  it('мусор в адресе — витрина; «Всё одним списком» показывает все разделы сразу', async () => {
    location.hash = '#slot=nope'
    const w = await mountApp()
    expect(w.find('[data-testid="slot-cell-themes"]').exists()).toBe(true)
    await w.find('[data-testid="slot-show-all"]').trigger('click')
    await flushPromises()
    for (const id of ['themes', 'chart-markers', 'splash', 'streakflame', 'avatar_frame']) expect(w.find('#sg-' + id).exists(), id).toBe(true)
    expect(w.find('[data-testid="slot-title"]').text()).toBe('Все разделы')
    w.unmount()
  })
})
