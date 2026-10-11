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
import { ALL_TAB, resolveTab, showsSection } from './lib/pageTabs'

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
    expect(resolveTab('splash', ['themes', 'splash'])).toBe('splash')
    expect(resolveTab('gone', ['themes', 'splash'])).toBe('themes')
    expect(resolveTab(null, ['themes', 'splash'])).toBe('themes')
    expect(resolveTab(ALL_TAB, ['themes'])).toBe(ALL_TAB)
    expect(resolveTab(null, [])).toBe(ALL_TAB)
  })
  it('раздел показывается на своей вкладке и на «Все», больше нигде', () => {
    expect(showsSection('themes', 'themes')).toBe(true)
    expect(showsSection('themes', 'splash')).toBe(false)
    expect(showsSection(ALL_TAB, 'splash')).toBe(true)
  })
})

describe('Кастомизация: вкладки на странице', () => {
  it('по умолчанию открыта первая вкладка «Темы»: видны темы, нет заставки и рамок', async () => {
    const w = await mountApp()
    expect(w.find('[data-testid="cust-tab-themes"]').attributes('aria-selected')).toBe('true')
    expect(w.find('#sg-themes').exists()).toBe(true)
    expect(w.find('#sg-splash').exists()).toBe(false)
    expect(w.find('#sg-avatar_frame').exists()).toBe(false)
    w.unmount()
  })

  it('переключение на «Рамки аватарки» показывает только их и запоминается', async () => {
    const w = await mountApp()
    await w.find('[data-testid="cust-tab-avatar_frame"]').trigger('click')
    expect(w.find('#sg-avatar_frame').exists()).toBe(true)
    expect(w.find('#sg-themes').exists()).toBe(false)
    expect(localStorage.getItem('cust_tab')).toBe('avatar_frame')
    w.unmount()
    const w2 = await mountApp()
    expect(w2.find('[data-testid="cust-tab-avatar_frame"]').attributes('aria-selected')).toBe('true')
    expect(w2.find('#sg-avatar_frame').exists()).toBe(true)
    w2.unmount()
  })

  it('«Все» показывает все разделы сразу', async () => {
    const w = await mountApp()
    await w.find('[data-testid="cust-tab-all"]').trigger('click')
    for (const id of ['themes', 'chart-markers', 'splash', 'streakflame', 'avatar_frame']) expect(w.find('#sg-' + id).exists(), id).toBe(true)
    w.unmount()
  })
})
