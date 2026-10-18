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
import { SLOTS, childSlots, topSlots } from './lib/slots'
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
    for (const s of SLOTS) expect(parseSlotHash(slotHash(s.id)), s.id).toBe(s.parent ?? s.id) // вложенный слот открывает родителя
    expect(slotHash('')).toBe('')
  })
})

describe('витрина слотов на странице', () => {
  it('по умолчанию — ячейки всех слотов по группам, а самих разделов нет', async () => {
    const w = await mountApp()
    for (const s of topSlots()) expect(w.find(`[data-testid="slot-cell-${s.id}"]`).exists(), s.id).toBe(true)
    for (const s of SLOTS.filter((x) => x.parent)) expect(w.find(`[data-testid="slot-cell-${s.id}"]`).exists(), s.id + ' — вложенный, своей ячейки нет').toBe(false)
    expect(w.findAll('[data-testid="slot-group-title"]').length).toBeGreaterThanOrEqual(4)
    expect(w.find('#sg-themes').exists()).toBe(false)
    expect(w.find('#sg-splash').exists()).toBe(false)
    expect(w.find('[data-testid="cust-tabs"]').exists()).toBe(false) // вкладок-групп больше нет
    w.unmount()
  })
  it('в каждой ячейке стоит «открыто/всего», у «бесплатных» — по реестру вариантов', async () => {
    const w = await mountApp()
    for (const s of topSlots()) expect(w.find(`[data-testid="slot-cell-${s.id}"] [data-testid="slot-count"]`).text(), s.id).toMatch(/^\d+\/\d+$/)
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

describe('«Анимация воды» — один слот вместо двух (64.1, срез 4)', () => {
  const water = () => {
    const own = [SLOTS.find((x) => x.id === 'water_anim')!, ...childSlots('water_anim')]
    return own
  }
  it('в реестре базовые анимации — вложенный слот; ячейка одна, счётчик — сумма базовых и дополнительных', async () => {
    expect(childSlots('water_anim').map((x) => x.id)).toEqual(['wateranim'])
    const w = await mountApp()
    expect(w.findAll('[data-testid^="slot-cell-"]').filter((e) => /water/.test(e.attributes('data-testid')!)).map((e) => e.attributes('data-testid'))).toEqual(['slot-cell-water_anim', 'slot-cell-water_glass'])
    const [owned, total] = w.find('[data-testid="slot-cell-water_anim"] [data-testid="slot-count"]').text().split('/').map(Number)
    expect(total).toBeGreaterThan(6) // 6 базовых + платные
    expect(owned).toBe(6) // платных ещё нет
    expect(water().length).toBe(2)
    w.unmount()
  })
  it('экран слота показывает и базовые, и дополнительные с подзаголовками; названия не повторяются', async () => {
    location.hash = '#slot=water_anim'
    const w = await mountApp()
    expect(w.find('#sg-wateranim').exists()).toBe(true)
    expect(w.find('#sg-water_anim').exists()).toBe(true)
    expect(w.find('[data-testid="water-base-title"]').text()).toBe('Базовые')
    expect(w.find('[data-testid="water-extra-title"]').text()).toBe('Дополнительные')
    expect(w.find('[data-testid="slot-title"]').text()).toContain('Анимация воды')
    expect(w.find('#sg-themes').exists()).toBe(false)
    // счётчики слота общие для базовых и дополнительных: 6 базовых уже «мои», платных ещё нет
    const [owned, total] = w.find('[data-testid="slot-title-count"]').text().split('/').map(Number)
    expect(owned).toBe(6)
    expect(total).toBeGreaterThan(6)
    expect(w.find('[data-testid="slot-mode-mine"]').text()).toContain('6')
    expect(w.find('[data-testid="slot-mode-all"]').text()).toContain(String(total))
    w.unmount()
  })
  it('адрес базового слота (#slot=wateranim) открывает тот же экран воды; в «всём одним списком» заголовки двух разделов разные', async () => {
    location.hash = '#slot=wateranim'
    let w = await mountApp()
    expect(w.find('#sg-water_anim').exists()).toBe(true)
    expect(w.find('#sg-wateranim').exists()).toBe(true)
    w.unmount()
    location.hash = '#slot=all'
    w = await mountApp()
    const titles = w.findAll('[data-section="wateranim"] .sg-name, [data-section="water_anim"] .sg-name').map((e) => e.text())
    expect(titles.length).toBe(2)
    expect(new Set(titles).size).toBe(2)
    w.unmount()
  })
})
