import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const h = vi.hoisted(() => ({ total: 250, owned: [] as any[] }))
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
      then: (res: (v: unknown) => unknown) => Promise.resolve({ data: table === 'user_customizations' ? h.owned : [], error: null }).then(res),
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
  h.total = 250
  h.owned = []
  globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ version: '1.00', en: [], ru: [] }))) as unknown as typeof fetch
})

describe('страница «Кастомизация»', () => {
  it('два раздела («За баллы», «За достижения»), баланс и карточки рамок', async () => {
    const w = mount(App)
    await flushPromises()
    expect(w.find('[data-section="points"]').exists()).toBe(true)
    expect(w.find('[data-section="achievement"]').exists()).toBe(true)
    expect(w.find('[data-testid="balance"]').text()).toContain('250')
    expect(w.find('[data-testid="item-frame_neon"]').attributes('data-status')).toBe('buyable')
    expect(w.find('[data-testid="item-frame_gold"]').attributes('data-status')).toBe('locked')
    w.unmount()
  })

  it('путь «купить → надеть → снять» целиком', async () => {
    const w = mount(App)
    await flushPromises()
    await w.find('[data-testid="item-frame_neon"] [data-testid="buy"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="item-frame_neon"]').attributes('data-status')).toBe('owned')
    expect(w.find('[data-testid="balance"]').text()).toContain('150')
    await w.find('[data-testid="item-frame_neon"] [data-testid="choose"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="item-frame_neon"]').attributes('data-status')).toBe('selected')
    await w.find('[data-testid="item-frame_neon"] [data-testid="unchoose"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="item-frame_neon"]').attributes('data-status')).toBe('owned')
    w.unmount()
  })

  it('не хватает баллов: кнопка «Не хватает N» неактивна', async () => {
    h.total = 40
    const w = mount(App)
    await flushPromises()
    const btn = w.find('[data-testid="item-frame_aurora"] [data-testid="short"]')
    expect(btn.exists()).toBe(true)
    expect(btn.attributes('disabled')).toBeDefined()
    expect(btn.text()).toContain('110')
    w.unmount()
  })
})

describe('анимированные рамки на странице', () => {
  it('у огненной и радужной есть пометка «Анимированная» и класс анимации на превью; у неоновой нет', async () => {
    const w = mount(App)
    await flushPromises()
    expect(w.find('[data-testid="item-frame_flame"] [data-testid="animated"]').exists()).toBe(true)
    expect(w.find('[data-testid="item-frame_flame"] span.cust-frame-flame').exists()).toBe(true)
    expect(w.find('[data-testid="item-frame_rainbow"] span.cust-frame-rainbow').exists()).toBe(true)
    expect(w.find('[data-testid="item-frame_neon"] [data-testid="animated"]').exists()).toBe(false)
    expect(w.find('[data-testid="item-frame_flame"]').attributes('data-status')).toBe('buyable')
    w.unmount()
  })
})
