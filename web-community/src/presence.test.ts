import { beforeEach, describe, expect, it, vi } from 'vitest'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node
import { readFileSync } from 'node:fs'
import { flushPromises, mount } from '@vue/test-utils'

// «В сети» / «был(а) N назад» у друга (BACKLOG 48.2, миграция 069).
const h = vi.hoisted(() => ({ presence: { data: null as unknown, error: null as unknown }, throws: false }))
vi.mock('./lib/supabase', () => ({
  sb: {
    rpc: async (name: string) => {
      if (name === 'get_friends_presence') {
        if (h.throws) throw new Error('offline')
        return h.presence
      }
      return { data: { user_id: 'f1', display_name: 'Аня', avatar_url: null, registered_at: '2026-09-12T10:00:00Z', friends_since: '2026-10-03T09:00:00Z', hidden: false, points_total: 5, points_week: 1, perfect_streak: 0, goals_done: 0, active_days_30: 1, favorite_exercise: null, badges_count: 0, badges: [], frame: null }, error: null }
    },
  },
}))

import FriendCard from './components/FriendCard.vue'
import PublicProfileModal from './components/PublicProfileModal.vue'
import { loadFriendsPresence, presenceLabel } from './lib/presence'

const NOW = new Date('2026-10-12T12:00:00.000Z')
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString()
const MIN = 60_000

describe('presenceLabel', () => {
  beforeEach(() => localStorage.setItem('site_lang', 'ru'))
  it('меньше 5 минут — «в сети»; границы минут / часов / дней', () => {
    expect(presenceLabel(ago(30_000), NOW)).toEqual({ online: true, text: 'в сети' })
    expect(presenceLabel(ago(5 * MIN - 1), NOW)?.online).toBe(true)
    expect(presenceLabel(ago(5 * MIN), NOW)).toEqual({ online: false, text: 'был(а) в сети 5 мин назад' })
    expect(presenceLabel(ago(59 * MIN), NOW)?.text).toBe('был(а) в сети 59 мин назад')
    expect(presenceLabel(ago(60 * MIN), NOW)?.text).toBe('был(а) в сети 1 ч назад')
    expect(presenceLabel(ago(23 * 60 * MIN), NOW)?.text).toBe('был(а) в сети 23 ч назад')
    expect(presenceLabel(ago(24 * 60 * MIN), NOW)?.text).toBe('был(а) в сети 1 дн назад')
    expect(presenceLabel(ago(10 * 24 * 60 * MIN), NOW)?.text).toBe('был(а) в сети 10 дн назад')
  })
  it('по-английски тоже', () => {
    localStorage.setItem('site_lang', 'en')
    expect(presenceLabel(ago(2 * 60 * MIN), NOW)?.text).toBe('was online 2 h ago')
    expect(presenceLabel(ago(1000), NOW)?.text).toBe('online')
  })
  it('нет отметки / не дата — молчим; небольшой «будущий» сдвиг часов — «в сети», большой — молчим', () => {
    expect(presenceLabel(null, NOW)).toBeNull()
    expect(presenceLabel(undefined, NOW)).toBeNull()
    expect(presenceLabel('вчера', NOW)).toBeNull()
    expect(presenceLabel(ago(-2 * MIN), NOW)?.online).toBe(true)
    expect(presenceLabel(ago(-10 * MIN), NOW)).toBeNull()
  })
})

describe('loadFriendsPresence', () => {
  beforeEach(() => {
    h.throws = false
    h.presence = { data: null, error: null }
  })
  it('собирает карту user_id → отметка, мусорные строки пропускает', async () => {
    h.presence = { data: [{ user_id: 'a', last_seen_at: '2026-10-12T11:59:00Z' }, { user_id: 'b' }, { last_seen_at: 'x' }, { user_id: 5, last_seen_at: 'y' }], error: null }
    const m = await loadFriendsPresence()
    expect([...m.entries()]).toEqual([['a', '2026-10-12T11:59:00Z']])
  })
  it('ошибка сервера (миграция не применена), не массив или сбой сети — пустая карта', async () => {
    h.presence = { data: null, error: { message: 'function does not exist' } }
    expect((await loadFriendsPresence()).size).toBe(0)
    h.presence = { data: { not: 'array' }, error: null }
    expect((await loadFriendsPresence()).size).toBe(0)
    h.throws = true
    expect((await loadFriendsPresence()).size).toBe(0)
  })
})

describe('показ в интерфейсе', () => {
  beforeEach(() => localStorage.setItem('site_lang', 'ru'))
  it('карточка друга: «в сети» зелёным, «был(а)» тусклым, без отметки строки нет', () => {
    const on = mount(FriendCard, { props: { name: 'Аня', avatarUrl: null, presence: { online: true, text: 'в сети' } } })
    expect(on.find('[data-testid="friend-presence"]').text()).toContain('в сети')
    expect(on.find('[data-testid="friend-presence"]').attributes('data-online')).toBe('true')
    const off = mount(FriendCard, { props: { name: 'Аня', avatarUrl: null, presence: { online: false, text: 'был(а) в сети 3 ч назад' } } })
    expect(off.find('[data-testid="friend-presence"]').attributes('data-online')).toBe('false')
    expect(off.find('[data-testid="friend-presence"]').text()).toContain('3 ч назад')
    expect(mount(FriendCard, { props: { name: 'Аня', avatarUrl: null } }).find('[data-testid="friend-presence"]').exists()).toBe(false)
    expect(mount(FriendCard, { props: { name: 'Аня', avatarUrl: null, presence: null } }).find('[data-testid="friend-presence"]').exists()).toBe(false)
  })
  it('окно профиля друга показывает подпись; без неё — нет', async () => {
    const props = { name: 'Аня', avatarUrl: null, keys: [], points: 5, streak: 0, userId: 'f1', isFriend: true }
    const w = mount(PublicProfileModal, { props: { ...props, presence: { online: false, text: 'был(а) в сети 2 дн назад' } } })
    await flushPromises()
    expect(w.find('[data-testid="profile-presence"]').text()).toContain('2 дн назад')
    const w2 = mount(PublicProfileModal, { props })
    await flushPromises()
    expect(w2.find('[data-testid="profile-presence"]').exists()).toBe(false)
  })
})

describe('подключение в App.vue (страж)', () => {
  const app = readFileSync('src/App.vue', 'utf-8')
  it('карточка друга и окно профиля получают подпись; отметки обновляются раз в минуту и снимаются при уходе', () => {
    expect(app).toContain(':presence="presenceFor(p.user_id)"')
    expect(app).toContain('openedProfile.isFriend ? presenceFor(openedProfile.userId) : null') // посторонним подпись не показываем
    expect(app).toContain('setInterval(() => void refreshPresence(), 60_000)')
    expect(app).toContain('clearInterval(presenceTimer)')
  })
})
