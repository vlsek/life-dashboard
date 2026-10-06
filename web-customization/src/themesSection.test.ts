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
import { FAVORITE_THEMES_KEY, getTheme, readFavoriteThemes, sanitizeFavoriteThemes, visibleThemes } from './lib/theme'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  document.documentElement.className = 'theme-dark'
  h.total = 250
  h.owned = []
  globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ version: '1.00', en: [], ru: [] }))) as unknown as typeof fetch
})

const favs = () => JSON.parse(localStorage.getItem(FAVORITE_THEMES_KEY) || 'null')

describe('любимые темы: логика', () => {
  it('по умолчанию — прежние четыре; пустое и сломанное тоже дают их', () => {
    expect(readFavoriteThemes()).toEqual(['dark', 'monet', 'light', 'pink'])
    expect(sanitizeFavoriteThemes([])).toEqual(['dark', 'monet', 'light', 'pink'])
    expect(sanitizeFavoriteThemes('x')).toEqual(['dark', 'monet', 'light', 'pink'])
    localStorage.setItem(FAVORITE_THEMES_KEY, '{oops')
    expect(readFavoriteThemes()).toEqual(['dark', 'monet', 'light', 'pink'])
  })
  it('чистка: только известные темы, без повторов, не больше четырёх', () => {
    expect(sanitizeFavoriteThemes(['mint', 'mint', 'nope', 'nord', 'amoled', 'sepia', 'mocha'])).toEqual(['mint', 'nord', 'amoled', 'sepia'])
  })
  it('активная тема всегда есть в списке сайдбара, даже если она не любимая', () => {
    localStorage.setItem(FAVORITE_THEMES_KEY, JSON.stringify(['dark', 'light']))
    expect(visibleThemes('dark')).toEqual(['dark', 'light'])
    expect(visibleThemes('mint')).toEqual(['dark', 'light', 'mint'])
  })
})

describe('страница «Кастомизация»: раздел «Темы»', () => {
  it('показывает все 11 тем, отмечены любимые по умолчанию, счётчик «4 из 4»', async () => {
    const w = mount(App)
    await flushPromises()
    const cards = w.findAll('[data-section="themes"] [data-testid^="theme-"][data-active]')
    expect(cards).toHaveLength(11)
    expect(w.findAll('[data-section="themes"] [data-favorite="true"]').map((c) => c.attributes('data-testid'))).toEqual(['theme-dark', 'theme-monet', 'theme-light', 'theme-pink'])
    expect(w.find('[data-testid="fav-count"]').text()).toBe('Любимых: 4 из 4')
    expect(w.find('[data-section="themes"]').text()).toContain('Все темы бесплатные')
  })

  it('секция тем идёт до рамок аватарок', async () => {
    const w = mount(App)
    await flushPromises()
    const html = w.html()
    expect(html.indexOf('data-section="themes"')).toBeLessThan(html.indexOf('data-section="avatar_frame"'))
  })

  it('«Применить» включает тему: класс на <html>, localStorage, у карточки пометка «Применена»', async () => {
    const w = mount(App)
    await flushPromises()
    expect(w.find('[data-testid="theme-dark"] [data-testid="applied"]').exists()).toBe(true)
    await w.find('[data-testid="theme-mint"] [data-testid="apply"]').trigger('click')
    expect(document.documentElement.classList.contains('theme-mint')).toBe(true)
    expect(localStorage.getItem('site_theme')).toBe('mint')
    expect(getTheme()).toBe('mint')
    expect(w.find('[data-testid="theme-mint"] [data-testid="applied"]').exists()).toBe(true)
    expect(w.find('[data-testid="theme-dark"] [data-testid="apply"]').exists()).toBe(true)
  })

  it('при четырёх любимых новое сердечко недоступно; убрав одну, можно добавить другую', async () => {
    const w = mount(App)
    await flushPromises()
    const nord = () => w.find('[data-testid="theme-nord"] [data-testid="fav"]')
    expect(nord().attributes('disabled')).toBeDefined()
    await w.find('[data-testid="theme-pink"] [data-testid="fav"]').trigger('click')
    expect(favs()).toEqual(['dark', 'monet', 'light'])
    expect(w.find('[data-testid="fav-count"]').text()).toBe('Любимых: 3 из 4')
    expect(nord().attributes('disabled')).toBeUndefined()
    await nord().trigger('click')
    expect(favs()).toEqual(['dark', 'monet', 'light', 'nord'])
    expect(w.find('[data-testid="theme-nord"]').attributes('data-favorite')).toBe('true')
  })

  it('последнюю любимую убрать нельзя (в списке сайдбара не может остаться пусто)', async () => {
    localStorage.setItem(FAVORITE_THEMES_KEY, JSON.stringify(['amoled']))
    const w = mount(App)
    await flushPromises()
    expect(w.find('[data-testid="theme-amoled"] [data-testid="fav"]').attributes('disabled')).toBeDefined()
  })

  it('отметка любимой посылает событие — сайдбар перерисует список', async () => {
    const seen = vi.fn()
    window.addEventListener('favorite-themes:changed', seen)
    const w = mount(App)
    await flushPromises()
    await w.find('[data-testid="theme-pink"] [data-testid="fav"]').trigger('click')
    expect(seen).toHaveBeenCalled()
    window.removeEventListener('favorite-themes:changed', seen)
  })

  it('превью — мини-диаграмма в цветах самой темы (кольцо, три столбика), а не текущей и не просто квадраты', async () => {
    const w = mount(App)
    await flushPromises()
    const pv = w.find('[data-testid="theme-amoled"] [data-testid="theme-preview"]')
    expect(pv.element.tagName.toLowerCase()).toBe('svg')
    expect(pv.attributes('style')).toMatch(/rgb\(0, 0, 0\)|#000/)
    expect(pv.findAll('[data-testid="preview-bar"]')).toHaveLength(3)
    const ring = pv.find('[data-testid="preview-ring"]')
    expect(ring.attributes('stroke')).toBe('#4ea1ff') // акцент AMOLED
    expect(pv.findAll('[data-testid="preview-bar"]').map((b) => b.attributes('fill'))).toEqual(['#63b3f5', '#4caf6a', '#4ea1ff']) // вода, успех, акцент
    const mint = w.find('[data-testid="theme-mint"] [data-testid="preview-ring"]')
    expect(mint.attributes('stroke')).toBe('#13805a')
  })
})
