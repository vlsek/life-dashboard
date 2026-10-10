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
import { COLLAPSED_KEY } from './lib/useCollapsed'

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

const section = (w: ReturnType<typeof mount>, id: string) => w.find(`[data-section="${id}"]`)
const hidden = (w: ReturnType<typeof mount>, id: string) => (section(w, id).find('[data-testid="section-body"]').element as HTMLElement).style.display === 'none'

// BACKLOG 51.3: каждый раздел «Кастомизации» (Темы, Рамки, Стаканы …) сворачивается, состояние помним
describe('«Кастомизация»: сворачиваемые разделы', () => {
  it('у каждого раздела заголовок-кнопка в <h2> со счётчиком «открыто/всего», по умолчанию всё развёрнуто', async () => {
    const w = mount(App)
    await flushPromises()
    const sections = w.findAll('section[data-section]')
    expect(sections.length).toBeGreaterThan(1)
    for (const s of sections) {
      const btn = s.find('h2 > [data-testid="section-toggle"]')
      expect(btn.exists()).toBe(true)
      expect(btn.attributes('aria-expanded')).toBe('true')
      expect(btn.attributes('aria-controls')).toBe('sg-' + s.attributes('data-section'))
      expect(s.find('[data-testid="section-count"]').text()).toMatch(/^\d+\/\d+$/)
      expect(s.attributes('data-collapsed')).toBe('false')
    }
    w.unmount()
  })

  it('клик сворачивает раздел: aria-expanded=false, содержимое скрыто, но остаётся в DOM; соседние разделы не затронуты', async () => {
    const w = mount(App)
    await flushPromises()
    const cardsBefore = section(w, 'themes').findAll('[data-testid^="theme-"][data-active]').length
    await section(w, 'themes').find('[data-testid="section-toggle"]').trigger('click')
    expect(section(w, 'themes').find('[data-testid="section-toggle"]').attributes('aria-expanded')).toBe('false')
    expect(hidden(w, 'themes')).toBe(true)
    expect(section(w, 'themes').findAll('[data-testid^="theme-"][data-active]')).toHaveLength(cardsBefore)
    const other = w.findAll('section[data-section]').find((s) => s.attributes('data-section') !== 'themes')!
    expect(other.find('[data-testid="section-body"]').attributes('style') ?? '').not.toContain('display: none')
    await section(w, 'themes').find('[data-testid="section-toggle"]').trigger('click')
    expect(hidden(w, 'themes')).toBe(false)
    w.unmount()
  })

  it('состояние запоминается на устройстве и восстанавливается при следующем заходе', async () => {
    const w = mount(App)
    await flushPromises()
    await section(w, 'themes').find('[data-testid="section-toggle"]').trigger('click')
    expect(JSON.parse(localStorage.getItem(COLLAPSED_KEY) || '[]')).toContain('section:themes')
    w.unmount()
    const w2 = mount(App)
    await flushPromises()
    expect(section(w2, 'themes').find('[data-testid="section-toggle"]').attributes('aria-expanded')).toBe('false')
    expect(hidden(w2, 'themes')).toBe(true)
    w2.unmount()
  })

  it('группы редкости внутри раздела сворачиваются независимо и не мешают разделу', async () => {
    const w = mount(App)
    await flushPromises()
    await section(w, 'themes').find('[data-testid="rarity-toggle"]').trigger('click')
    const saved = JSON.parse(localStorage.getItem(COLLAPSED_KEY) || '[]') as string[]
    expect(saved.some((x) => x.startsWith('themes:'))).toBe(true)
    expect(saved).not.toContain('section:themes')
    expect(hidden(w, 'themes')).toBe(false)
    w.unmount()
  })

  it('счётчик раздела «Темы» считает открытые из всех: при 250 баллах он не больше общего числа тем', async () => {
    const w = mount(App)
    await flushPromises()
    const [owned, total] = section(w, 'themes').find('[data-testid="section-count"]').text().split('/').map(Number)
    expect(total).toBe(25)
    expect(owned).toBeGreaterThan(0)
    expect(owned).toBeLessThanOrEqual(total)
    w.unmount()
  })
})
