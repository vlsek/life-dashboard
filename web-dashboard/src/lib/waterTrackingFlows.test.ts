import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'

// «Отслеживать воду» (BACKLOG 932): как выключенный учёт воды влияет на Дашборд — кольца, серии, «идеальный день», «баллы за день», напоминания.
// Баланс и журнал баллов (loadBalance/usePointsLog) воду НЕ отбрасывают — прошлые баллы остаются; это проверено в waterTrackingBalance.test.ts.
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
  return {
    sb: {
      auth: { getSession: async () => ({ data: { session: { user: { id: 'u', email: 'a@b.c' } } } }) },
      from: (table: string) => builder(table),
    },
  }
})

import { useDashboard } from './useDashboard'
import { useDailyMetrics } from './useDailyMetrics'
import { useEveningReminder } from './useEveningReminder'
import { useWaterReminder } from './useWaterReminder'
import { _resetTrackWaterForTests, saveTrackWater } from './waterTracking'
import { addDays, fmtDate, todayStr } from './date'

const metric = (o: Row): Row => ({ user_id: 'u', unit: null, goal_direction: 'at_least', schedule: null, category_id: null, active: true, ...o })
const water = metric({ id: 'w', name: 'Вода', icon: '💧', type: 'number', goal_value: 2000, position: 1 })
const habit = metric({ id: 'h', name: 'Зарядка', icon: null, type: 'boolean', goal_value: null, position: 2 })
const today = todayStr()
const day = (back: number) => fmtDate(addDays(new Date(), -back))

function setup<T>(use: () => T): { api: T; wrapper: ReturnType<typeof mount> } {
  let api!: T
  const wrapper = mount(defineComponent({ setup: () => ((api = use()), () => null) }))
  return { api, wrapper }
}

beforeEach(() => {
  localStorage.clear()
  _resetTrackWaterForTests()
  h.tables = { profiles: [{ onboarded: true }], metrics: [water, habit], daily_values: [], daily_notes: [], goals: [] }
})
afterEach(() => vi.useRealTimers())

describe('Дашборд: кольца, серии и «идеальный день» без воды', () => {
  // зарядка сделана 3 дня подряд, вода сегодня только 500 из 2000, а два предыдущих дня выпита норма
  const values = () => [
    ...[0, 1, 2].map((i) => ({ date: day(i), metric_id: 'h', value: true })),
    { date: today, metric_id: 'w', value: 500 },
    { date: day(1), metric_id: 'w', value: 2500 },
    { date: day(2), metric_id: 'w', value: 2500 },
  ]

  it('контроль — включено: вода считается (1 из 2), сегодня не идеальный, серия воды видна', async () => {
    h.tables.daily_values = values()
    const { api, wrapper } = setup(useDashboard)
    await api.init()
    expect(api.dayProgress.value).toMatchObject({ done: 1, total: 2 })
    expect(api.perfectInfo.value?.todayPerfect).toBe(false)
    expect(api.streaks.value.some((s) => s.kind === 'metric' && s.metric?.id === 'w')).toBe(true)
    wrapper.unmount()
  })

  it('выключено: воды нет в кольце дня (1 из 1), день становится идеальным, серия воды из списка пропала', async () => {
    h.tables.profiles = [{ onboarded: true, track_water: false }]
    h.tables.daily_values = values()
    const { api, wrapper } = setup(useDashboard)
    await api.init()
    expect(api.dayProgress.value).toMatchObject({ done: 1, total: 1 })
    expect(api.perfectInfo.value?.todayPerfect).toBe(true)
    expect(api.streaks.value.some((s) => s.kind === 'metric' && s.metric?.id === 'w')).toBe(false)
    expect(api.streaks.value.some((s) => s.kind === 'metric' && s.metric?.id === 'h')).toBe(true) // остальные серии на месте
    wrapper.unmount()
  })

  it('выключили на лету: после события данных кольцо пересчитывается без воды, включили — вода возвращается', async () => {
    h.tables.daily_values = values()
    const { api, wrapper } = setup(useDashboard)
    await api.init()
    expect(api.dayProgress.value).toMatchObject({ done: 1, total: 2 })
    await saveTrackWater('u', false)
    await flushPromises()
    expect(api.dayProgress.value).toMatchObject({ done: 1, total: 1 })
    await saveTrackWater('u', true)
    await flushPromises()
    expect(api.dayProgress.value).toMatchObject({ done: 1, total: 2 })
    wrapper.unmount()
  })
})

describe('Дашборд: «Дневные метрики» (баллы за день) без воды', () => {
  it('включено — вода среди метрик, выключено — нет; остальные на месте', async () => {
    const on = setup(useDailyMetrics)
    await on.api.load('u', today)
    expect(on.api.metrics.value.map((m) => m.id)).toEqual(['w', 'h'])
    on.wrapper.unmount()

    _resetTrackWaterForTests()
    h.tables.profiles = [{ onboarded: true, track_water: false }]
    const off = setup(useDailyMetrics)
    await off.api.load('u', today)
    expect(off.api.metrics.value.map((m) => m.id)).toEqual(['h'])
    off.wrapper.unmount()
  })
})

describe('Дашборд: напоминания', () => {
  it('вечернее напоминание: вода в «ещё не сделано» только когда учёт включён', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 29, 21, 5))
    const on = setup(useEveningReminder)
    await on.api.load('u')
    expect(on.api.items.value.map((i) => i.metric.name)).toEqual(['Вода', 'Зарядка'])
    on.wrapper.unmount()

    _resetTrackWaterForTests()
    h.tables.profiles = [{ onboarded: true, track_water: false }]
    const off = setup(useEveningReminder)
    await off.api.load('u')
    expect(off.api.items.value.map((i) => i.metric.name)).toEqual(['Зарядка'])
    off.wrapper.unmount()
  })

  it('напоминание о воде: выключено — плашки нет; включив посреди сессии, плашку сразу не получаешь', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 1, 12, 0))
    h.tables.daily_values = [{ value: 700 }]
    h.tables.profiles = [{ onboarded: true, track_water: false }]
    const { api, wrapper } = setup(useWaterReminder)
    await api.load('u')
    expect(api.visible.value).toBe(false)
    expect(localStorage.getItem('water_reminder_last')).toBeNull() // и «время последнего показа» не тратится
    await saveTrackWater('u', true)
    await api.load()
    expect(api.visible.value).toBe(false)
    wrapper.unmount()
  })

  it('напоминание о воде: включено — показывается, как раньше (контроль)', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 1, 12, 0))
    h.tables.daily_values = [{ value: 700 }]
    const { api, wrapper } = setup(useWaterReminder)
    await api.load('u')
    expect(api.visible.value).toBe(true)
    wrapper.unmount()
  })
})
