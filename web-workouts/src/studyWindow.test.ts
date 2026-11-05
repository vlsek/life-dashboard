import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// BACKLOG 73.5 (часовой пояс): окно «учёба за последние 3 дня» на карте мышц — по ЛОКАЛЬНОЙ дате. Раньше since.toISOString() (UTC) давало окно,
// съехавшее на сутки в первые часы после полуночи (UTC+) или поздним вечером (UTC−). Тест не зависит от пояса: «сейчас» задаётся локальным временем.
const h = vi.hoisted(() => ({ gte: [] as unknown[][] }))
vi.mock('./lib/supabase', () => ({
  sb: {
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'u1', email: 'a@b.c' } } } }) },
    from: (table: string) => {
      const chain: Record<string, unknown> = {
        select: () => chain, eq: () => chain, order: () => chain, limit: () => chain, in: () => chain, not: () => chain, is: () => chain,
        gte: (...a: unknown[]) => (table === 'daily_values' && h.gte.push(a), chain),
        maybeSingle: () => Promise.resolve({ data: table === 'profiles' ? { onboarded: true } : null, error: null }),
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => {
          const data =
            table === 'metric_categories' ? [{ id: 'c1', key: 'study', label_ru: 'Учёба', label_en: 'Study' }]
              : table === 'metrics' ? [{ id: 'm1', type: 'boolean', goal_value: null, goal_direction: null, category_id: 'c1' }]
                : []
          return Promise.resolve({ data, error: null }).then(res, rej)
        },
      }
      return chain
    },
  },
}))
import { useWorkouts } from './lib/useWorkouts'

const sinceFor = async (now: Date): Promise<string> => {
  h.gte = []
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(now)
  useWorkouts() // загрузка стартует сама при создании
  for (let i = 0; i < 40; i++) await Promise.resolve()
  vi.useRealTimers()
  const call = h.gte.find((a) => a[0] === 'date')
  expect(call, 'запрос значений учёбы с нижней границей даты').toBeTruthy()
  return String(call![1])
}

beforeEach(() => localStorage.clear())
afterEach(() => vi.useRealTimers())

describe('Тренировки: окно «учёба за 3 дня» считается по локальной дате', () => {
  it('в первые минуты после локальной полуночи — 3 дня назад по локальному календарю', async () => {
    expect(await sinceFor(new Date(2026, 10, 2, 0, 30))).toBe('2026-10-30')
  })
  it('поздним вечером — тоже 3 дня назад по локальному календарю', async () => {
    expect(await sinceFor(new Date(2026, 10, 2, 23, 30))).toBe('2026-10-30')
  })
  it('через границу месяца и года', async () => {
    expect(await sinceFor(new Date(2027, 0, 2, 0, 15))).toBe('2026-12-30')
  })
})
