import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { MIN_PEOPLE, peerPercent, toPeerMap } from './lib/rarityPeers'
import AchievementCard from './components/AchievementCard.vue'
import { evaluate, type Counters } from './lib/achievements'

// «Открыли N% людей» (BACKLOG 78.8, срез 1; миграция 118)
const h = vi.hoisted(() => ({ mode: 'ok' as 'ok' | 'dberror' | 'throws' | 'rejects', rows: [] as unknown[] }))
vi.mock('./lib/supabase', () => ({
  sb: {
    rpc: (name: string) => {
      if (name !== 'achievement_rarity') throw new Error('unexpected rpc ' + name)
      if (h.mode === 'throws') throw new TypeError('rpc is not a function')
      if (h.mode === 'rejects') return Promise.reject(new Error('network down'))
      if (h.mode === 'dberror') return Promise.resolve({ data: null, error: { message: 'function does not exist', code: '42883' } })
      return Promise.resolve({ data: h.rows, error: null })
    },
  },
}))
import { useAchievementRarity } from './lib/useAchievementRarity'

const ZERO: Counters = { streakBest: 0, perfectDays: 0, pointsTotal: 0, metricDone: 0, weightEntries: 0, goalsDone: 0, skillsMastered: 0, booksDone: 0, workoutDays: 0, challengesDone: 0, megaWeeks: 0, wordsAdded: 0, wordsLearned: 0, milestonesDone: 0, goalsStreakBest: 0 }
const stateOf = (key: string) => evaluate({ ...ZERO }).find((s) => s.def.key === key)!

beforeEach(() => {
  h.mode = 'ok'
  h.rows = []
  localStorage.setItem('site_lang', 'ru')
})
afterEach(() => localStorage.removeItem('site_lang'))

describe('peerPercent', () => {
  it('целый процент от общего числа людей', () => {
    expect(peerPercent(5, 20)).toBe(25)
    expect(peerPercent(1, 3 * 20)).toBe(2)
    expect(peerPercent(20, 20)).toBe(100)
    expect(peerPercent('7', '20')).toBe(35) // числа из базы могут прийти строками (bigint)
  })
  it('меньше 1% — это 0 (открыли, но доля округляется до нуля), а не «никто»', () => {
    expect(peerPercent(1, 400)).toBe(0)
  })
  it('мало людей в выборке — ничего не показываем (порог 20 и в базе, и здесь)', () => {
    expect(MIN_PEOPLE).toBe(20)
    expect(peerPercent(10, 19)).toBeNull()
    expect(peerPercent(10, 0)).toBeNull()
    expect(peerPercent(1, 20)).toBe(5)
  })
  it('кривые данные и «никто не открыл» — null; доля не больше 100', () => {
    expect(peerPercent(0, 50)).toBeNull()
    expect(peerPercent(-3, 50)).toBeNull()
    expect(peerPercent(null, 50)).toBeNull()
    expect(peerPercent('abc', 50)).toBeNull()
    expect(peerPercent(60, 50)).toBe(100)
  })
})

describe('toPeerMap', () => {
  it('ключ → процент; служебные ключи, пустые и кривые строки отбрасываются', () => {
    const rows = [
      { key: 'first_goal', owners: 15, total: 25 },
      { key: 'streak_30', owners: 1, total: 400 },
      { key: '_baseline', owners: 25, total: 25 },
      { key: '', owners: 5, total: 25 },
      { key: 'small', owners: 5, total: 10 },
      null,
      'мусор',
      { owners: 3, total: 25 },
    ]
    expect(toPeerMap(rows)).toEqual({ first_goal: 60, streak_30: 0 })
  })
  it('не массив — пустая карта', () => {
    expect(toPeerMap(null)).toEqual({})
    expect(toPeerMap({ key: 'x' })).toEqual({})
  })
})

describe('useAchievementRarity', () => {
  it('успех: проценты по ключам, percentOf отдаёт число или null', async () => {
    h.rows = [{ key: 'first_goal', owners: 5, total: 20 }]
    const r = useAchievementRarity()
    await r.load()
    expect(r.available.value).toBe(true)
    expect(r.percentOf('first_goal')).toBe(25)
    expect(r.percentOf('streak_30')).toBeNull()
  })
  it('функции нет в базе (миграция 118 не применена) — недоступно, без исключения', async () => {
    h.mode = 'dberror'
    const r = useAchievementRarity()
    await expect(r.load()).resolves.toBeUndefined()
    expect(r.available.value).toBe(false)
    expect(r.percentOf('first_goal')).toBeNull()
  })
  it('людей мало (база молчит, 0 строк) — недоступно', async () => {
    h.rows = []
    const r = useAchievementRarity()
    await r.load()
    expect(r.available.value).toBe(false)
  })
  it('клиент бросил исключение или запрос оборвался — недоступно, без исключения, прежние данные очищены', async () => {
    const r = useAchievementRarity()
    h.rows = [{ key: 'first_goal', owners: 5, total: 20 }]
    await r.load()
    expect(r.percentOf('first_goal')).toBe(25)
    h.mode = 'throws'
    await expect(r.load()).resolves.toBeUndefined()
    expect(r.percentOf('first_goal')).toBeNull()
    h.mode = 'ok'
    await r.load()
    h.mode = 'rejects'
    await expect(r.load()).resolves.toBeUndefined()
    expect(r.available.value).toBe(false)
  })
})

describe('AchievementCard: строка «Открыли N% людей»', () => {
  const base = () => ({ state: stateOf('first_goal'), unlocked: false, unlockedAt: null as string | null })
  it('показывает процент, а при 0 — «меньше 1%»', () => {
    const w = mount(AchievementCard, { props: { ...base(), peerPercent: 37 } })
    expect(w.get('[data-testid="achievement-peers"]').text()).toBe('Открыли 37% людей')
    const w0 = mount(AchievementCard, { props: { ...base(), peerPercent: 0 } })
    expect(w0.get('[data-testid="achievement-peers"]').text()).toBe('Открыли меньше 1% людей')
  })
  it('нет данных (null / не передано) — строки нет, карточка как раньше', () => {
    expect(mount(AchievementCard, { props: { ...base(), peerPercent: null } }).find('[data-testid="achievement-peers"]').exists()).toBe(false)
    expect(mount(AchievementCard, { props: base() }).find('[data-testid="achievement-peers"]').exists()).toBe(false)
  })
  it('английский текст', () => {
    localStorage.setItem('site_lang', 'en')
    const w = mount(AchievementCard, { props: { ...base(), peerPercent: 12 } })
    expect(w.get('[data-testid="achievement-peers"]').text()).toBe('Opened by 12% of people')
    const w0 = mount(AchievementCard, { props: { ...base(), peerPercent: 0 } })
    expect(w0.get('[data-testid="achievement-peers"]').text()).toBe('Opened by less than 1% of people')
  })
  it('у открытого достижения строка тоже есть, вместе с датой', () => {
    const w = mount(AchievementCard, { props: { state: stateOf('first_goal'), unlocked: true, unlockedAt: '2026-10-05T10:00:00.000Z', peerPercent: 40 } })
    expect(w.find('[data-testid="achievement-peers"]').exists()).toBe(true)
    expect(w.find('[data-testid="achievement-when"]').exists()).toBe(true)
  })
})
