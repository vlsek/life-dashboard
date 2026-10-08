import { beforeEach, describe, expect, it, vi } from 'vitest'

// Сводка по другу (BACKLOG 41 «8:51», миграция 056): разбор ответа, «нет миграции», запрос, даты.
const h = vi.hoisted(() => ({ result: { data: null as unknown, error: null as unknown }, calls: [] as { fn: string; args: unknown }[] }))
vi.mock('./supabase', () => ({ sb: { rpc: (fn: string, args: unknown) => (h.calls.push({ fn, args }), Promise.resolve(h.result)) } }))

import { daysSince, fetchFriendSummary, fmtSummaryDate, isMissingFunction, parseFriendSummary } from './friendSummary'

beforeEach(() => {
  h.result = { data: null, error: null }
  h.calls = []
})

const full = {
  user_id: 'f1', display_name: 'Аня', avatar_url: null, registered_at: '2026-09-12T10:00:00Z', friends_since: '2026-10-03T09:00:00Z', hidden: false,
  points_total: '1250.5', points_week: 42, perfect_streak: 6, goals_done: '9', active_days_30: 21, favorite_exercise: 'Подтягивания',
  badges_count: 12, badges: [{ key: 'streak_7', unlocked_at: '2026-10-01T00:00:00Z' }, { key: 'bad' }, { nokey: 1 }], frame: 'gold',
}

describe('parseFriendSummary', () => {
  it('приводит числа (bigint строкой), оставляет только значки с ключом, пустые строки → null', () => {
    const s = parseFriendSummary({ ...full, favorite_exercise: '', frame: '' })!
    expect(s.points_total).toBe(1250.5)
    expect(s.goals_done).toBe(9)
    expect(s.badges!.map((b) => b.key)).toEqual(['streak_7', 'bad'])
    expect(s.favorite_exercise).toBeNull()
    expect(s.frame).toBeNull()
    expect(s.hidden).toBe(false)
  })
  it('скрытый друг: нет статистики — поля undefined, hidden = true', () => {
    const s = parseFriendSummary({ user_id: 'f2', display_name: 'Боб', avatar_url: null, registered_at: null, friends_since: null, hidden: true })!
    expect(s.hidden).toBe(true)
    expect(s.points_total).toBeUndefined()
    expect(s.badges).toBeUndefined()
  })
  it('мусор → null', () => {
    for (const bad of [null, undefined, 5, 'x', {}, { user_id: 7 }]) expect(parseFriendSummary(bad)).toBeNull()
  })
})

describe('isMissingFunction / fetchFriendSummary', () => {
  it('коды PGRST202 / 42883 и текст «Could not find the function» — миграция 056 не применена', () => {
    expect(isMissingFunction({ code: 'PGRST202' })).toBe(true)
    expect(isMissingFunction({ code: '42883' })).toBe(true)
    expect(isMissingFunction({ message: 'Could not find the function public.get_friend_summary(friend)' })).toBe(true)
    expect(isMissingFunction({ code: '42501', message: 'not a friend' })).toBe(false)
    expect(isMissingFunction(null)).toBe(false)
  })
  it('успех: зовёт функцию с id друга и возвращает разобранные данные', async () => {
    h.result = { data: full, error: null }
    const r = await fetchFriendSummary('f1')
    expect(h.calls).toEqual([{ fn: 'get_friend_summary', args: { friend: 'f1' } }])
    expect(r.status).toBe('ok')
    if (r.status === 'ok') expect(r.data.display_name).toBe('Аня')
  })
  it('нет функции → unsupported; другая ошибка → error; мусор в ответе → error', async () => {
    h.result = { data: null, error: { code: 'PGRST202', message: 'x' } }
    expect((await fetchFriendSummary('f1')).status).toBe('unsupported')
    h.result = { data: null, error: { code: '42501', message: 'not a friend' } }
    expect((await fetchFriendSummary('f1')).status).toBe('error')
    h.result = { data: { nothing: true }, error: null }
    expect((await fetchFriendSummary('f1')).status).toBe('error')
  })
})

describe('даты', () => {
  it('fmtSummaryDate: по-русски и по-английски; пусто/мусор → пустая строка', () => {
    expect(fmtSummaryDate('2026-09-12T10:00:00Z', 'ru')).toContain('2026')
    expect(fmtSummaryDate('2026-09-12T10:00:00Z', 'ru')).toMatch(/сентября/)
    expect(fmtSummaryDate('2026-09-12T10:00:00Z', 'en')).toMatch(/September/)
    expect(fmtSummaryDate(null)).toBe('')
    expect(fmtSummaryDate('nope')).toBe('')
  })
  it('daysSince: целые дни; будущее и мусор → null', () => {
    const now = new Date('2026-10-08T12:00:00Z')
    expect(daysSince('2026-10-01T12:00:00Z', now)).toBe(7)
    expect(daysSince('2026-10-09T12:00:00Z', now)).toBeNull()
    expect(daysSince('x', now)).toBeNull()
    expect(daysSince(null, now)).toBeNull()
  })
})
