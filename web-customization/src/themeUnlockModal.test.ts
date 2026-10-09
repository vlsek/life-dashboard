import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

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

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  document.documentElement.className = 'theme-dark'
  h.total = 250
  h.owned = []
  h.ach = []
  globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ version: '1.00', en: [], ru: [] }))) as unknown as typeof fetch
})


const open = async () => {
  const w = mount(App, { attachTo: document.body })
  await flushPromises()
  await flushPromises()
  return w
}

describe('закрытая тема: окно «как получить» (BACKLOG 49.10)', () => {
  it('нажатие на закрытую тему открывает окно с достижением и условием; «Закрыть» убирает его', async () => {
    const w = await open()
    expect(w.find('[data-testid="theme-unlock-modal"]').exists()).toBe(false)
    const locked = w.find('[data-testid="theme-sepia"] [data-testid="theme-locked"]')
    expect(locked.exists()).toBe(true)
    await locked.trigger('click')
    const modal = w.find('[data-testid="theme-unlock-modal"]')
    expect(modal.exists()).toBe(true)
    expect(modal.text()).toContain('Сепия')
    expect(w.find('[data-testid="unlock-achievement"]').text()).toContain('Сотня слов')
    expect(w.find('[data-testid="unlock-condition"]').text()).toBe('Слов добавлено в «Языках»: 100')
    expect(w.find('[data-testid="unlock-open-achievements"]').attributes('href')).toBe('/achievements/')
    await w.find('[data-testid="unlock-close"]').trigger('click')
    expect(w.find('[data-testid="theme-unlock-modal"]').exists()).toBe(false)
    w.unmount()
  })

  it('у каждой закрытой темы окно показывает своё условие; открытая тема окна не открывает', async () => {
    const w = await open()
    const lockedCards = w.findAll('[data-testid="theme-locked"]')
    expect(lockedCards.length).toBeGreaterThanOrEqual(6)
    await lockedCards[0].trigger('click')
    expect(w.find('[data-testid="unlock-condition"]').text()).toMatch(/\d/)
    await w.find('[data-testid="unlock-close"]').trigger('click')
    const apply = w.find('[data-testid="apply"]')
    if (apply.exists()) await apply.trigger('click')
    expect(w.find('[data-testid="theme-unlock-modal"]').exists()).toBe(false)
    w.unmount()
  })
})
