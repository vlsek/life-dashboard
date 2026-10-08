import { beforeEach, describe, expect, it, vi } from 'vitest'

// «Отслеживать воду» (BACKLOG 932, ответ владельца 2026-10-07): после выключения прошлые баллы за воду ОСТАЮТСЯ в балансе и журнале баллов.
// Баланс и журнал не вызывают dropWaterIfOff — воду отбрасывают только кольца, серии, «идеальные дни» и «баллы за день».
type Row = Record<string, unknown>
const h = vi.hoisted(() => ({ tables: {} as Record<string, Row[]> }))
vi.mock('./supabase', () => {
  const builder = (table: string): any =>
    new Proxy(
      {},
      {
        get: (_t, key) => {
          if (key === 'then') return (res: (v: unknown) => unknown) => Promise.resolve({ data: h.tables[table] ?? [], error: null }).then(res)
          if (key === 'maybeSingle') return () => Promise.resolve({ data: (h.tables[table] ?? [])[0] ?? null, error: null })
          if (key === 'range') return () => Promise.resolve({ data: h.tables[table] ?? [], error: null })
          return () => builder(table)
        },
      },
    )
  return { sb: { auth: { getSession: async () => ({ data: { session: { user: { id: 'u' } } } }) }, from: (table: string) => builder(table) } }
})

import { loadBalance } from './loadBalance'
import { usePointsLog } from './usePointsLog'
import { _resetTrackWaterForTests } from './waterTracking'
import { addDays, fmtDate } from './date'

const metric = (o: Row): Row => ({ user_id: 'u', unit: null, goal_direction: 'at_least', schedule: null, category_id: null, active: true, ...o })
const water = metric({ id: 'w', name: 'Вода', icon: '💧', type: 'number', goal_value: 2000, position: 1 })
const habit = metric({ id: 'h', name: 'Зарядка', icon: null, type: 'boolean', goal_value: null, position: 2 })
const day = (back: number) => fmtDate(addDays(new Date(), -back))
// вода выпита по норме три прошлых дня, зарядка один раз
const values = [1, 2, 3].map((i) => ({ date: day(i), metric_id: 'w', value: 2500 })).concat([{ date: day(1), metric_id: 'h', value: true as unknown as number }])

beforeEach(() => {
  localStorage.clear()
  _resetTrackWaterForTests()
  h.tables = { profiles: [{ onboarded: true }], metrics: [water, habit], daily_values: values, goals: [], skills: [], books: [], shop_items: [], achievement_bonuses: [] }
})

describe('баланс и журнал баллов при выключенном учёте воды', () => {
  it('баланс тот же, что при включённом: баллы за прошлую воду на месте', async () => {
    const on = await loadBalance('u')
    expect(on.ok).toBe(true)
    h.tables.profiles = [{ onboarded: true, track_water: false }]
    _resetTrackWaterForTests()
    const off = await loadBalance('u2')
    expect(off).toEqual(on)
    expect(on.ok && on.balance).toBeGreaterThan(0)
  })

  it('журнал баллов: строки воды за прошлые дни остаются', async () => {
    h.tables.profiles = [{ onboarded: true, track_water: false }]
    const { log, load } = usePointsLog('u')
    await load()
    const lines = JSON.stringify(log.value)
    expect(lines).toContain('Вода')
    expect(log.value?.earnedWeek ?? 0).toBeGreaterThan(0)
  })
})
