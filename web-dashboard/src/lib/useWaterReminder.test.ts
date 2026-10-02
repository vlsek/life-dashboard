import { beforeEach, describe, expect, it, vi } from 'vitest'

type Row = Record<string, unknown>
const h = vi.hoisted(() => ({ tables: {} as Record<string, Row[]>, fail: false, calls: 0 }))

vi.mock('./supabase', () => {
  function builder(table: string) {
    const b: Record<string, unknown> = {}
    const rows = () => {
      h.calls++
      if (h.fail) return { data: null, error: { message: 'boom' } }
      return { data: h.tables[table] ?? [], error: null }
    }
    for (const m of ['select', 'eq', 'order', 'limit']) b[m] = () => b
    b.maybeSingle = async () => {
      const r = rows()
      return { data: r.data ? (r.data as Row[])[0] ?? null : null, error: r.error }
    }
    b.then = (resolve: (v: unknown) => unknown) => resolve(rows())
    return b
  }
  return { sb: { from: (table: string) => builder(table) } }
})
vi.mock('./waterGoal', async (orig) => {
  const real = (await orig()) as Record<string, unknown>
  return { ...real, withWaterGoal: async (_u: string, m: unknown[]) => m }
})

import { useWaterReminder } from './useWaterReminder'
import { WATER_REMINDER_LAST_KEY, WATER_REMINDER_OFF_KEY } from './waterReminder'

const water = { id: 'w1', user_id: 'u', name: 'Вода', icon: '💧', type: 'number', goal_value: 2000, goal_direction: 'at_least', active: true }

// 12:00 по местному времени — не тихие часы
const noon = new Date(2026, 9, 1, 12, 0)

describe('useWaterReminder', () => {
  beforeEach(() => {
    localStorage.clear()
    h.fail = false
    h.calls = 0
    h.tables = { metrics: [water], daily_values: [{ value: 700 }] }
    vi.useFakeTimers()
    vi.setSystemTime(noon)
  })

  it('shows once on open when the goal is not reached, and remembers the time', async () => {
    const r = useWaterReminder()
    await r.load('u')
    expect(r.visible.value).toBe(true)
    expect(r.ml.value).toBe(700)
    expect(r.goal.value).toBe(2000)
    expect(Number(localStorage.getItem(WATER_REMINDER_LAST_KEY))).toBe(noon.getTime())
  })

  it('is not shown again within 3 hours (a fresh page open right after)', async () => {
    await useWaterReminder().load('u')
    const second = useWaterReminder()
    await second.load('u')
    expect(second.visible.value).toBe(false)
  })

  it('shows again after 3 hours', async () => {
    await useWaterReminder().load('u')
    vi.setSystemTime(new Date(noon.getTime() + 3 * 60 * 60 * 1000 + 1000))
    const again = useWaterReminder()
    await again.load('u')
    expect(again.visible.value).toBe(true)
  })

  it('decides only once per page: later data changes never make it pop up by itself', async () => {
    const r = useWaterReminder()
    await r.load('u')
    r.dismiss()
    expect(r.visible.value).toBe(false)
    await r.load()
    expect(r.visible.value).toBe(false)
  })

  it('hides itself when the goal gets reached while it is on screen', async () => {
    const r = useWaterReminder()
    await r.load('u')
    h.tables.daily_values = [{ value: 2100 }]
    await r.load()
    expect(r.visible.value).toBe(false)
  })

  it('stays hidden when the goal is already reached, when switched off, and for users without a water metric', async () => {
    h.tables.daily_values = [{ value: 2500 }]
    const a = useWaterReminder()
    await a.load('u')
    expect(a.visible.value).toBe(false)

    h.tables.daily_values = [{ value: 100 }]
    localStorage.setItem(WATER_REMINDER_OFF_KEY, '1')
    const b = useWaterReminder()
    await b.load('u')
    expect(b.visible.value).toBe(false)

    localStorage.clear()
    h.tables.metrics = [{ id: 'm', user_id: 'u', name: 'Зарядка', icon: '🔥', type: 'boolean', active: true }]
    const c = useWaterReminder()
    await c.load('u')
    expect(c.visible.value).toBe(false)
  })

  it('a failing request neither shows anything nor uses up the show-time', async () => {
    h.fail = true
    const r = useWaterReminder()
    await r.load('u')
    expect(r.visible.value).toBe(false)
    expect(localStorage.getItem(WATER_REMINDER_LAST_KEY)).toBeNull()
    h.fail = false
    await r.load()
    expect(r.visible.value).toBe(true) // решение не потрачено: при следующей успешной загрузке напомнит
  })

  it('does not remind at night', async () => {
    vi.setSystemTime(new Date(2026, 9, 1, 23, 30))
    const r = useWaterReminder()
    await r.load('u')
    expect(r.visible.value).toBe(false)
    expect(localStorage.getItem(WATER_REMINDER_LAST_KEY)).toBeNull()
  })
})
