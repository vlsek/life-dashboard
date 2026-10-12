import { beforeEach, describe, expect, it, vi } from 'vitest'

// Серия по целям (BACKLOG 60.1, миграция 079): разбор ответа, «нет функции — нет плашки», склонение.
const h = vi.hoisted(() => ({ result: { data: null as unknown, error: null as unknown } }))
vi.mock('./lib/supabase', () => ({ sb: { rpc: () => Promise.resolve(h.result) } }))

import { daysWord, fetchGoalsStreak, parseGoalsStreak } from './lib/goalsStreak'

beforeEach(() => {
  h.result = { data: null, error: null }
})

describe('серия по целям', () => {
  it('parse: числа (в т.ч. строкой), best не меньше current, мусор → null', () => {
    expect(parseGoalsStreak({ current: 3, best: 7 })).toEqual({ current: 3, best: 7 })
    expect(parseGoalsStreak({ current: '4', best: '2' })).toEqual({ current: 4, best: 4 })
    expect(parseGoalsStreak({ current: -1, best: 2 })).toBeNull()
    expect(parseGoalsStreak({ current: 1 })).toBeNull()
    expect(parseGoalsStreak('x')).toBeNull()
    expect(parseGoalsStreak(null)).toBeNull()
  })
  it('fetch: ответ → серия; ошибка (нет миграции) → null', async () => {
    h.result = { data: { current: 2, best: 5 }, error: null }
    expect(await fetchGoalsStreak()).toEqual({ current: 2, best: 5 })
    h.result = { data: null, error: { code: 'PGRST202' } }
    expect(await fetchGoalsStreak()).toBeNull()
  })
  it('склонение дней', () => {
    expect([1, 2, 5, 11, 12, 21, 22, 25, 111].map((n) => daysWord(n, 'ru'))).toEqual(['день', 'дня', 'дней', 'дней', 'дней', 'день', 'дня', 'дней', 'дней'])
    expect(daysWord(1, 'en')).toBe('day')
    expect(daysWord(0, 'en')).toBe('days')
  })
})
