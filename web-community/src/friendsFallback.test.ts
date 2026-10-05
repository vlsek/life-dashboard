import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// 🐞 BACKLOG раздел 34: «в сообществе раздел друзья написано «пока ни на кого не подписан», но это не так».
// Подписки есть (follows, get_friend_ids), но запрос профилей ничего не вернул — раньше карточек не было, а подпись говорила «никого».
const h = vi.hoisted(() => ({
  follows: [{ followed_id: 'zed' }] as { followed_id: string }[],
  friendIds: ['bob'] as string[],
  profiles: [] as unknown[],
  profilesError: false,
  leaderboard: [] as unknown[],
}))

vi.mock('./lib/supabase', () => {
  function chain(table: string) {
    let single = false
    const p: unknown = new Proxy(
      {},
      {
        get(_t, prop) {
          if (prop === 'then') {
            return (resolve: (v: unknown) => void) => {
              if (table === 'profiles') {
                if (single) return resolve({ data: { onboarded: true, display_name: 'Me', leaderboard_visible: true }, error: null })
                return resolve(h.profilesError ? { data: null, error: { message: 'permission denied' } } : { data: h.profiles, error: null })
              }
              if (table === 'follows') return resolve({ data: h.follows, error: null })
              return resolve({ data: [], error: null })
            }
          }
          if (prop === 'maybeSingle' || prop === 'single') return () => ((single = true), p)
          return () => p
        },
      },
    )
    return p
  }
  return {
    sb: {
      auth: { getSession: async () => ({ data: { session: { user: { id: 'me', email: 'me@x.com' } } } }) },
      from: (table: string) => chain(table),
      async rpc(fn: string) {
        if (fn === 'get_friend_ids') return { data: h.friendIds, error: null }
        if (fn === 'get_leaderboard_period' || fn === 'get_leaderboard') return { data: h.leaderboard, error: null }
        return { data: [], error: null }
      },
    },
  }
})

import App from './App.vue'

const lb = (id: string, name: string) => ({ user_id: id, display_name: name, avatar_url: null, total_points: 10, perfect_streak: 2, leaderboard_visible: true })
async function mountApp() {
  const w = mount(App, { attachTo: document.body })
  await flushPromises()
  return w
}
const NONE = /Пока ни на кого не подписан|not following anyone yet/i

beforeEach(() => {
  localStorage.setItem('site_lang', 'ru')
  h.follows = [{ followed_id: 'zed' }]
  h.friendIds = ['bob']
  h.profiles = []
  h.profilesError = false
  h.leaderboard = []
})

describe('Друзья: подпись «ни на кого не подписан» не врёт', () => {
  it('подписки есть, профили не прочитались, лидерборд пуст — карточки-заглушки «Без имени», подписи «ни на кого» нет, убрать можно', async () => {
    const w = await mountApp()
    expect(w.text()).not.toMatch(NONE)
    expect(w.text().match(/Без имени/g)?.length).toBe(2) // друг bob и подписка zed
    expect(w.findAll('button[title="Убрать из друзей"]')).toHaveLength(1)
    w.unmount()
  })

  it('профили не прочитались, но друзья есть в лидерборде — карточки с их именами', async () => {
    h.leaderboard = [lb('bob', 'Bob'), lb('zed', 'Zed')]
    const w = await mountApp()
    expect(w.text()).not.toMatch(NONE)
    expect(w.text()).toContain('Bob')
    expect(w.text()).toContain('Zed')
    expect(w.text()).not.toContain('Без имени')
    w.unmount()
  })

  it('запрос профилей упал с ошибкой — то же самое: карточки есть', async () => {
    h.profilesError = true
    h.leaderboard = [lb('bob', 'Bob'), lb('zed', 'Zed')]
    const w = await mountApp()
    expect(w.text()).not.toMatch(NONE)
    expect(w.text()).toContain('Bob')
    w.unmount()
  })

  it('профили прочитались — имена из профилей, как раньше', async () => {
    h.profiles = [{ user_id: 'bob', display_name: 'Боб-профиль', avatar_url: null }, { user_id: 'zed', display_name: 'Зед-профиль', avatar_url: null }]
    const w = await mountApp()
    expect(w.text()).toContain('Боб-профиль')
    expect(w.text()).toContain('Зед-профиль')
    expect(w.text()).not.toMatch(NONE)
    w.unmount()
  })

  it('подписок и друзей правда нет — подпись показывается', async () => {
    h.follows = []
    h.friendIds = []
    const w = await mountApp()
    expect(w.text()).toMatch(NONE)
    expect(w.text()).not.toContain('Без имени')
    w.unmount()
  })
})
