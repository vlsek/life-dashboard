import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// Лента достижений в Сообществе (BACKLOG 395, миграция 052): события только по выбранным значкам, раскрытый профиль со ВСЕМИ значками,
// выбор «что показывать в ленте» — не больше 5, без миграции блок и выбор скрыты, остальная страница работает.
const h = vi.hoisted(() => ({ feedError: false, pickError: false, upserts: [] as Record<string, unknown>[], feed: [] as Record<string, unknown>[] }))
vi.mock('./lib/supabase', () => {
  function chain(table: string, record: { upsert?: Record<string, unknown> }) {
    let single = false
    let cols = ''
    const p: unknown = new Proxy({}, {
      get(_t, prop) {
        if (prop === 'then') {
          return (resolve: (v: unknown) => void) => {
            if (table === 'profiles' && cols.includes('feed_achievements') && !record.upsert) {
              return resolve(h.pickError ? { data: null, error: { message: 'column does not exist' } } : { data: { feed_achievements: ['streak_30'] }, error: null })
            }
            if (table === 'profiles') return resolve({ data: single ? { onboarded: true, display_name: 'Me', leaderboard_visible: true, customization: {} } : [], error: null })
            return resolve({ data: [], error: null })
          }
        }
        if (prop === 'select') return (c: string) => ((cols = c), p)
        if (prop === 'upsert') return (row: Record<string, unknown>) => { record.upsert = row; h.upserts.push(row); return p }
        if (prop === 'maybeSingle' || prop === 'single') return () => ((single = true), p)
        return () => p
      },
    })
    return p
  }
  const row = (id: string, name: string, pts: number) => ({ user_id: id, display_name: name, avatar_url: null, total_points: pts, perfect_streak: 2, leaderboard_visible: true })
  const ago = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString()
  const badge = (user_id: string, key: string) => ({ user_id, key, unlocked_at: ago(1) })
  const sb = {
    auth: { getSession: async () => ({ data: { session: { user: { id: 'me', email: 'me@x.com' } } } }) },
    from: (table: string) => chain(table, {}),
    async rpc(fn: string) {
      switch (fn) {
        case 'get_leaderboard_period':
          return { data: [row('u1', 'Anna', 90), row('u2', 'Boris', 80), row('u3', 'Clara', 70), row('u4', 'Dmitry', 60), row('me', 'Me', 10)], error: null }
        case 'get_public_badges':
          return { data: [badge('u1', 'streak_30'), badge('u1', 'goals_10'), badge('u1', 'books_5'), badge('u1', 'words_25'), badge('u2', 'goals_10'),
            ...['first_goal', 'streak_5', 'streak_10', 'streak_30', 'points_100', 'points_500', 'books_5'].map((k) => badge('me', k))], error: null }
        case 'get_achievement_feed':
          return h.feedError ? { data: null, error: { message: 'Could not find the function' } } : { data: h.feed, error: null }
        default:
          return { data: [], error: null }
      }
    },
  }
  return { sb, logout: vi.fn() }
})

import App from './App.vue'

const ev = (user_id: string, name: string, key: string, daysAgo: number) => ({ user_id, display_name: name, avatar_url: null, key, unlocked_at: new Date(Date.now() - daysAgo * 86_400_000).toISOString() })

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  h.feedError = false
  h.pickError = false
  h.upserts = []
  h.feed = [ev('u1', 'Anna', 'streak_30', 0), ev('u2', 'Boris', 'goals_10', 1), ev('u3', 'Clara', 'not_in_registry', 0)]
  globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ version: '1.00', en: [], ru: [] }))) as unknown as typeof fetch
})

describe('лента достижений', () => {
  it('показывает события выбранных значков: имя, название, когда; неизвестный ключ не рисуется', async () => {
    const w = mount(App)
    await flushPromises()
    const rows = w.findAll('[data-testid="feed-row"]')
    expect(rows).toHaveLength(2)
    expect(rows[0].text()).toContain('Anna')
    expect(rows[0].text()).toContain('Месяц в огне') // название streak_30 из реестра
    expect(w.find('[data-testid="feed-when-0"]').text()).toBe('сегодня')
    expect(w.find('[data-testid="feed-when-1"]').text()).toBe('вчера')
    expect(w.find('[data-testid="achievement-feed"]').text()).not.toContain('Clara')
    w.unmount()
  })

  it('событий нет — понятная пустая подсказка, блок остаётся', async () => {
    h.feed = []
    const w = mount(App)
    await flushPromises()
    expect(w.find('[data-testid="feed-empty"]').exists()).toBe(true)
    w.unmount()
  })

  it('нет функции (052 не применена) — блока ленты нет, страница работает', async () => {
    h.feedError = true
    const w = mount(App)
    await flushPromises()
    expect(w.find('[data-testid="achievement-feed"]').exists()).toBe(false)
    expect(w.find('[data-testid="podium"]').exists()).toBe(true)
    w.unmount()
  })

  it('клик по строке ленты раскрывает профиль: ВСЕ достижения человека, а не только выбранное для ленты', async () => {
    const w = mount(App)
    await flushPromises()
    await w.findAll('[data-testid="feed-row"]')[0].trigger('click')
    const modal = w.find('[data-testid="public-profile"]')
    expect(modal.exists()).toBe(true)
    expect(modal.find('[data-testid="public-profile-name"]').text()).toBe('Anna')
    expect(modal.findAll('[data-testid="public-badge"]')).toHaveLength(4) // в ленте — один, в профиле — все четыре
    await modal.find('[data-testid="public-profile-close"]').trigger('click')
    expect(w.find('[data-testid="public-profile"]').exists()).toBe(false)
    w.unmount()
  })

  it('профиль раскрывается и с подиума и из списка; у человека без публичных значков — пояснение, не пустая сетка', async () => {
    const w = mount(App)
    await flushPromises()
    await w.find('[data-rank="2"]').trigger('click') // Boris
    expect(w.find('[data-testid="public-profile-name"]').text()).toBe('Boris')
    await w.find('[data-testid="public-profile-close"]').trigger('click')
    await w.findAll('[data-testid="rest-row"]')[0].trigger('click') // Dmitry: значков нет
    expect(w.find('[data-testid="public-profile-name"]').text()).toBe('Dmitry')
    expect(w.find('[data-testid="public-profile-empty"]').exists()).toBe(true)
    expect(w.findAll('[data-testid="public-badge"]')).toHaveLength(0)
    w.unmount()
  })
})

describe('выбор «что показывать в ленте»', () => {
  async function openProfile() {
    const w = mount(App)
    await flushPromises()
    await w.find('[data-testid="profile-edit"]').trigger('click')
    return w
  }

  it('в окне профиля — мои открытые значки; ранее выбранный отмечен; выбрать можно не больше 5, остальные недоступны', async () => {
    const w = await openProfile()
    expect(w.findAll('[data-testid^="feed-pick-"]').filter((x) => x.element.tagName === 'LABEL')).toHaveLength(7)
    const box = (k: string) => w.find(`[data-testid="feed-pick-${k}"] input`)
    expect((box('streak_30').element as HTMLInputElement).checked).toBe(true) // уже выбран в профиле
    for (const k of ['first_goal', 'streak_5', 'streak_10', 'points_100']) await box(k).setValue(true)
    expect(w.find('[data-testid="feed-pick-count"]').text()).toContain('5 / 5')
    expect((box('points_500').element as HTMLInputElement).disabled).toBe(true) // шестой не выбрать
    expect((box('streak_5').element as HTMLInputElement).disabled).toBe(false) // а снять любой можно
    w.unmount()
  })

  it('«Сохранить» записывает выбор отдельно от имени и видимости', async () => {
    const w = await openProfile()
    await w.find('[data-testid="feed-pick-first_goal"] input').setValue(true)
    await w.find('[data-testid="profile-save"]').trigger('click')
    await flushPromises()
    const feedWrite = h.upserts.find((u) => 'feed_achievements' in u)
    expect(feedWrite).toEqual({ user_id: 'me', feed_achievements: ['streak_30', 'first_goal'] })
    expect(h.upserts.some((u) => 'display_name' in u && !('feed_achievements' in u))).toBe(true)
    w.unmount()
  })

  it('выбор не менялся — лишней записи нет', async () => {
    const w = await openProfile()
    await w.find('[data-testid="profile-save"]').trigger('click')
    await flushPromises()
    expect(h.upserts.some((u) => 'feed_achievements' in u)).toBe(false)
    w.unmount()
  })

  it('без миграции (колонки нет) выбор скрыт, окно профиля работает как раньше', async () => {
    h.pickError = true
    const w = await openProfile()
    expect(w.find('[data-testid="feed-pick-list"]').exists()).toBe(false)
    expect(w.find('[data-testid="profile-name-input"]').exists()).toBe(true)
    w.unmount()
  })
})
