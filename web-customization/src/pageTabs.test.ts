import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const h = vi.hoisted(() => ({ total: 250, owned: [] as any[], ach: [] as { key: string }[] }))
// Вкладки «Кастомизации» (BACKLOG 54.7): раздел на вкладку, один за раз, «Все» — прежняя лента; выбор помнится.
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
import { ALL_TAB, GROUP_ORDER, SECTION_GROUP, groupOfSection, groupsFor, migrateStoredTab, resolveTab, showsSection } from './lib/pageTabs'
import { CATEGORY_ORDER } from './lib/customization'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  localStorage.setItem('site_theme', 'dark')
  document.documentElement.className = 'theme-dark'
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

describe('вкладки: логика', () => {
  it('сохранённая вкладка, если она есть; иначе первая; «Все» всегда допустима', () => {
    expect(resolveTab('loading', ['look', 'loading'])).toBe('loading')
    expect(resolveTab('gone', ['look', 'loading'])).toBe('look')
    expect(resolveTab(null, ['look', 'loading'])).toBe('look')
    expect(resolveTab(ALL_TAB, ['look'])).toBe(ALL_TAB)
    expect(resolveTab(null, [])).toBe(ALL_TAB)
  })
  it('раздел показывается на вкладке своей группы и на «Все», больше нигде', () => {
    expect(showsSection('look', 'themes')).toBe(true)
    expect(showsSection('look', 'avatar_frame')).toBe(true)
    expect(showsSection('look', 'splash')).toBe(false)
    expect(showsSection('water', 'water_glass')).toBe(true)
    expect(showsSection(ALL_TAB, 'splash')).toBe(true)
  })
  it('страж 59.1: КАЖДАЯ категория каталога названа в SECTION_GROUP (новое не теряется в «Прочее» случайно)', () => {
    for (const c of CATEGORY_ORDER) expect(SECTION_GROUP[c], c).toBeTruthy()
    for (const g of Object.values(SECTION_GROUP)) expect(GROUP_ORDER).toContain(g)
  })
  it('неизвестный раздел → «Прочее»; группы идут в заданном порядке и без пустых', () => {
    expect(groupOfSection('brand_new')).toBe('other')
    expect(groupsFor(['splash', 'themes', 'brand_new', 'water_glass'])).toEqual(['look', 'water', 'loading', 'other'])
    expect(groupsFor([])).toEqual([])
  })
  it('старое сохранённое значение (id раздела) переезжает в группу', () => {
    expect(migrateStoredTab('splash')).toBe('loading')
    expect(migrateStoredTab('day_gauge')).toBe('home')
    expect(migrateStoredTab('water')).toBe('water')
    expect(migrateStoredTab('all')).toBe('all')
    expect(migrateStoredTab('мусор')).toBeNull()
    expect(migrateStoredTab(null)).toBeNull()
  })
})

describe('Кастомизация: вкладки на странице', () => {
  it('по умолчанию открыта первая группа «Оформление»: темы и рамки, но нет заставки и спидометров', async () => {
    const w = await mountApp()
    expect(w.find('[data-testid="cust-tab-look"]').attributes('aria-selected')).toBe('true')
    expect(w.find('#sg-themes').exists()).toBe(true)
    expect(w.find('#sg-avatar_frame').exists()).toBe(true)
    expect(w.find('#sg-splash').exists()).toBe(false)
    expect(w.find('#sg-day_gauge').exists()).toBe(false)
    w.unmount()
  })

  it('вкладок-групп немного (не больше шести + «Все»), а не по вкладке на раздел', async () => {
    const w = await mountApp()
    expect(w.findAll('[data-testid^="cust-tab-"]').length).toBeLessThanOrEqual(GROUP_ORDER.length + 1)
    w.unmount()
  })

  it('переключение на «Вода» показывает анимации и стакан и запоминается', async () => {
    const w = await mountApp()
    await w.find('[data-testid="cust-tab-water"]').trigger('click')
    expect(w.find('#sg-wateranim').exists()).toBe(true)
    expect(w.find('#sg-water_glass').exists()).toBe(true)
    expect(w.find('#sg-themes').exists()).toBe(false)
    expect(localStorage.getItem('cust_tab')).toBe('water')
    w.unmount()
    const w2 = await mountApp()
    expect(w2.find('[data-testid="cust-tab-water"]').attributes('aria-selected')).toBe('true')
    w2.unmount()
  })

  it('прежнее сохранённое значение «splash» открывает группу «Загрузка»', async () => {
    localStorage.setItem('cust_tab', 'splash')
    const w = await mountApp()
    expect(w.find('[data-testid="cust-tab-loading"]').attributes('aria-selected')).toBe('true')
    expect(w.find('#sg-splash').exists()).toBe(true)
    w.unmount()
  })

  it('«Все» показывает все разделы сразу', async () => {
    const w = await mountApp()
    await w.find('[data-testid="cust-tab-all"]').trigger('click')
    for (const id of ['themes', 'chart-markers', 'splash', 'streakflame', 'avatar_frame']) expect(w.find('#sg-' + id).exists(), id).toBe(true)
    w.unmount()
  })
})
