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
import { FAVORITE_THEMES_KEY, UNLOCKED_THEMES_KEY, getTheme, readFavoriteThemes, readUnlockedThemes, sanitizeFavoriteThemes, visibleThemes } from './lib/theme'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  localStorage.setItem('site_theme', 'dark') // тесты исходят из тёмной; светлая по умолчанию — в themeDefaultAllPilots.test.ts
  document.documentElement.className = 'theme-dark'
  h.total = 250
  h.owned = []
  h.ach = []
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
  it('закрытые темы-награды в списке сайдбара пропускаются, пока не открыты; открытые — показываются', () => {
    localStorage.setItem(FAVORITE_THEMES_KEY, JSON.stringify(['dark', 'mint', 'nord', 'light']))
    expect(visibleThemes('dark')).toEqual(['dark', 'light'])
    localStorage.setItem(UNLOCKED_THEMES_KEY, JSON.stringify(['nord']))
    expect(visibleThemes('dark')).toEqual(['dark', 'nord', 'light'])
  })
  it('уже включённая закрытая тема остаётся в списке (отнимать нельзя); если все любимые закрыты — прежние четыре', () => {
    localStorage.setItem(FAVORITE_THEMES_KEY, JSON.stringify(['dark', 'mint']))
    expect(visibleThemes('mint')).toEqual(['dark', 'mint'])
    localStorage.setItem(FAVORITE_THEMES_KEY, JSON.stringify(['mint', 'amoled']))
    expect(visibleThemes('dark')).toEqual(['dark', 'monet', 'light', 'pink'])
  })
})

describe('страница «Кастомизация»: раздел «Темы»', () => {
  it('показывает все 23 темы, отмечены любимые по умолчанию, счётчик «4 из 4»', async () => {
    const w = mount(App)
    await flushPromises()
    const cards = w.findAll('[data-section="themes"] [data-testid^="theme-"][data-active]')
    expect(cards).toHaveLength(23)
    expect(w.findAll('[data-section="themes"] [data-favorite="true"]').map((c) => c.attributes('data-testid'))).toEqual(['theme-dark', 'theme-monet', 'theme-light', 'theme-pink'])
    expect(w.find('[data-testid="fav-count"]').text()).toBe('Любимых: 4 из 4')
    expect(w.find('[data-section="themes"]').text()).toContain('Шесть тем — награды за достижения')
  })

  it('секция тем идёт до рамок аватарок', async () => {
    const w = mount(App)
    await flushPromises()
    const html = w.html()
    expect(html.indexOf('data-section="themes"')).toBeLessThan(html.indexOf('data-section="avatar_frame"'))
  })

  it('«Применить» включает тему: класс на <html>, localStorage, у карточки пометка «Применена»', async () => {
    h.ach = [{ key: 'skills_25' }] // Mint открыта наградой «Человек-оркестр»
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
    h.ach = [{ key: 'learned_100' }] // Nord открыта
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
    h.ach = [{ key: 'workouts_250' }] // AMOLED открыта
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

const LOCKED = ['mint', 'sepia', 'solarlight', 'nord', 'mocha', 'amoled']
const OPEN = ['dark', 'monet', 'light', 'pink', 'contrast']
const card = (w: ReturnType<typeof mount>, k: string) => w.find(`[data-testid="theme-${k}"]`)

describe('замок тем-наград (v3.42)', () => {
  it('без достижений закрыты ровно шесть тем: у них нет «Применить» и сердечка, есть замок и «Награда за «…»»', async () => {
    const w = mount(App)
    await flushPromises()
    for (const k of LOCKED) {
      expect(card(w, k).attributes('data-locked'), k).toBe('true')
      expect(card(w, k).find('[data-testid="apply"]').exists(), k).toBe(false)
      expect(card(w, k).find('[data-testid="fav"]').exists(), k).toBe(false)
      expect(card(w, k).find('[data-testid="theme-locked"]').text(), k).toContain('Закрыта')
    }
    for (const k of OPEN) {
      expect(card(w, k).attributes('data-locked'), k).toBe('false')
      expect(card(w, k).find('[data-testid="theme-locked"]').exists(), k).toBe(false)
    }
    expect(card(w, 'mocha').find('[data-testid="theme-unlock-text"]').text()).toBe('Награда за «Своя библиотека»')
    expect(card(w, 'sepia').find('[data-testid="theme-unlock-text"]').text()).toBe('Награда за «Сотня слов»')
    expect(card(w, 'amoled').find('[data-testid="theme-unlock-text"]').text()).toBe('Награда за «Атлет»')
    w.unmount()
  })

  it('подпись темы Mocha — «Орхидея»', async () => {
    const w = mount(App)
    await flushPromises()
    expect(card(w, 'mocha').text()).toContain('Орхидея')
    expect(w.text()).not.toContain('Catppuccin')
    w.unmount()
  })

  it('полученное достижение открывает свою тему и только её: появляются «Применить» и сердечко', async () => {
    h.ach = [{ key: 'words_100' }, { key: 'streak_5' }]
    const w = mount(App)
    await flushPromises()
    expect(card(w, 'sepia').attributes('data-locked')).toBe('false')
    expect(card(w, 'sepia').find('[data-testid="apply"]').exists()).toBe(true)
    expect(card(w, 'sepia').find('[data-testid="fav"]').exists()).toBe(true)
    for (const k of LOCKED.filter((x) => x !== 'sepia')) expect(card(w, k).attributes('data-locked'), k).toBe('true')
    w.unmount()
  })

  it('список открытых тем запоминается для шапки и меню — по полученным достижениям; события нет без изменений', async () => {
    h.ach = [{ key: 'books_25' }, { key: 'goals_50' }]
    const seen = vi.fn()
    window.addEventListener('unlocked-themes:changed', seen)
    const w = mount(App)
    await flushPromises()
    expect(readUnlockedThemes().sort()).toEqual(['mocha', 'solarlight'])
    expect(JSON.parse(localStorage.getItem(UNLOCKED_THEMES_KEY) || 'null').sort()).toEqual(['mocha', 'solarlight'])
    expect(seen).toHaveBeenCalledTimes(1)
    w.unmount()
    window.removeEventListener('unlocked-themes:changed', seen)
  })

  it('до окончания загрузки заслуженное не затирается: список обновляется только после загрузки достижений', async () => {
    localStorage.setItem(UNLOCKED_THEMES_KEY, JSON.stringify(['nord']))
    h.ach = [{ key: 'learned_100' }]
    const w = mount(App)
    expect(readUnlockedThemes()).toEqual(['nord']) // страница ещё грузится — прежний список цел
    await flushPromises()
    expect(readUnlockedThemes()).toEqual(['nord'])
    w.unmount()
  })

  it('счётчик «открыто/всего» в группах редкости считает открытые темы', async () => {
    h.ach = [{ key: 'skills_25' }]
    const w = mount(App)
    await flushPromises()
    expect(w.find('[data-testid="rarity-themes:common"] [data-testid="rarity-count"]').text()).toBe('17/17')
    expect(w.find('[data-testid="rarity-themes:uncommon"] [data-testid="rarity-count"]').text()).toBe('1/2')
    expect(w.find('[data-testid="rarity-themes:legendary"] [data-testid="rarity-count"]').text()).toBe('0/1')
    w.unmount()
  })

  it('закрытая тема не применяется даже вызовом: ни класса на <html>, ни записи', async () => {
    const w = mount(App)
    await flushPromises()
    expect(card(w, 'mint').find('[data-testid="apply"]').exists()).toBe(false)
    expect(localStorage.getItem('site_theme')).not.toBe('mint')
    expect(document.documentElement.classList.contains('theme-mint')).toBe(false)
    w.unmount()
  })

  it('уже включённая закрытая тема остаётся включённой: «Применена», без замка', async () => {
    localStorage.setItem('site_theme', 'nord')
    const w = mount(App)
    await flushPromises()
    expect(card(w, 'nord').find('[data-testid="applied"]').exists()).toBe(true)
    expect(card(w, 'nord').find('[data-testid="theme-locked"]').exists()).toBe(false)
    w.unmount()
  })

  it('закрытые любимые, отмеченные до замка, не занимают места: счётчик считает только открытые', async () => {
    localStorage.setItem(FAVORITE_THEMES_KEY, JSON.stringify(['dark', 'mint', 'nord', 'amoled']))
    const w = mount(App)
    await flushPromises()
    expect(w.find('[data-testid="fav-count"]').text()).toBe('Любимых: 1 из 4')
    expect(card(w, 'monet').find('[data-testid="fav"]').attributes('disabled')).toBeUndefined()
    w.unmount()
  })
})
