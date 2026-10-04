import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h as vh } from 'vue'

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
    for (const m of ['select', 'eq', 'gt', 'order', 'limit']) b[m] = () => b
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

import { toMl, useWaterReminder } from './useWaterReminder'
import { DATA_CHANGED } from './events'
import { WATER_REMINDER_LAST_KEY, WATER_REMINDER_OFF_KEY } from './waterReminder'
import { saveStack } from './waterUndo'
import { todayStr } from './date'

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

// BACKLOG 23 🐞 «15:19 — плашка-напоминалка не пропала, если выпил воду + в ней было некорректное значение»
describe('useWaterReminder: drinking water dismisses the reminder', () => {
  beforeEach(() => {
    localStorage.clear()
    h.fail = false
    h.tables = { metrics: [water], daily_values: [{ value: 700 }] }
    vi.useFakeTimers()
    vi.setSystemTime(noon)
  })

  it('hides after ANY water is added, not only when the whole goal is reached', async () => {
    const r = useWaterReminder()
    await r.load('u')
    expect(r.visible.value).toBe(true)
    h.tables.daily_values = [{ value: 950 }] // выпили 250 мл — до нормы ещё далеко
    await r.load()
    expect(r.visible.value).toBe(false)
  })

  it('stays when nothing was added (same total) and keeps the text current when the total goes down', async () => {
    const r = useWaterReminder()
    await r.load('u')
    await r.load()
    expect(r.visible.value).toBe(true)
    h.tables.daily_values = [{ value: 500 }] // отменили последнюю запись
    await r.load()
    expect(r.visible.value).toBe(true)
    expect(r.ml.value).toBe(500)
  })

  it('never comes back after it was hidden by drinking, even if the total later goes down (decided once per page)', async () => {
    const r = useWaterReminder()
    await r.load('u')
    h.tables.daily_values = [{ value: 1000 }]
    await r.load()
    h.tables.daily_values = [{ value: 400 }]
    await r.load()
    expect(r.visible.value).toBe(false)
  })

  it('reads a numeric string from the database as a number (it used to become 0 → "drunk 0 ml")', async () => {
    h.tables.daily_values = [{ value: '1500' }]
    const r = useWaterReminder()
    await r.load('u')
    expect(r.ml.value).toBe(1500)
    expect(r.visible.value).toBe(true)
  })

  it('treats a missing or garbage value as 0 ml instead of showing NaN', async () => {
    for (const bad of [null, undefined, 'abc', '', NaN, -50, {}, [] as unknown]) {
      h.tables.daily_values = [{ value: bad }]
      localStorage.clear()
      const r = useWaterReminder()
      await r.load('u')
      expect(r.ml.value).toBe(0)
    }
  })
})

describe('useWaterReminder: reacts to the water event of the header / right panel', () => {
  beforeEach(() => {
    localStorage.clear()
    h.fail = false
    h.tables = { metrics: [water], daily_values: [{ value: 700 }] }
    vi.useFakeTimers()
    vi.setSystemTime(noon)
  })
  const today = '2026-10-01'
  const host = () => {
    let api!: ReturnType<typeof useWaterReminder>
    const w = mount(defineComponent({ setup() { api = useWaterReminder(); return () => vh('i') } }))
    return { api, w }
  }
  const fire = (detail: Record<string, unknown>) => window.dispatchEvent(new CustomEvent(DATA_CHANGED, { detail }))

  it('hides immediately from the event total, without waiting for the database read', async () => {
    const { api, w } = host()
    await api.load('u')
    expect(api.visible.value).toBe(true)
    fire({ source: 'water', date: today, value: 950 })
    expect(api.visible.value).toBe(false) // сразу, синхронно
    expect(api.ml.value).toBe(950)
    w.unmount()
  })

  it('water added for ANOTHER date does not dismiss today\'s reminder or change its numbers', async () => {
    const { api, w } = host()
    await api.load('u')
    fire({ source: 'water', date: '2026-09-30', value: 3000 })
    await Promise.resolve()
    expect(api.visible.value).toBe(true)
    expect(api.ml.value).toBe(700)
    w.unmount()
  })

  it('an undo (smaller total) updates the numbers but keeps the reminder', async () => {
    const { api, w } = host()
    await api.load('u')
    fire({ source: 'water', date: today, value: 400 })
    expect(api.ml.value).toBe(400)
    expect(api.visible.value).toBe(true)
    w.unmount()
  })

  it('a garbage event value is ignored by the fast path', async () => {
    const { api, w } = host()
    await api.load('u')
    fire({ source: 'water', date: today, value: NaN })
    fire({ source: 'water', date: today, value: null })
    expect(api.ml.value).toBe(700)
    expect(api.visible.value).toBe(true)
    w.unmount()
  })

  it('the goal reached through the event hides it too', async () => {
    const { api, w } = host()
    await api.load('u')
    fire({ source: 'water', date: today, value: 2100 })
    expect(api.visible.value).toBe(false)
    w.unmount()
  })

  it('an event from another source is not trusted for the number — the database is re-read instead', async () => {
    const { api, w } = host()
    await api.load('u')
    h.tables.daily_values = [{ value: 1200 }]
    fire({ source: 'sets', date: today, value: 50 })
    await vi.advanceTimersByTimeAsync(0)
    await Promise.resolve()
    await Promise.resolve()
    expect(api.ml.value).toBe(1200)
    expect(api.visible.value).toBe(false)
    w.unmount()
  })

  it('does nothing while the reminder is not on screen', async () => {
    h.tables.daily_values = [{ value: 2500 }] // норма выпита — плашки нет
    const { api, w } = host()
    await api.load('u')
    expect(api.visible.value).toBe(false)
    fire({ source: 'water', date: today, value: 100 })
    expect(api.visible.value).toBe(false)
    w.unmount()
  })
})

describe('toMl', () => {
  it('accepts finite positive numbers and numeric strings', () => {
    expect(toMl(250)).toBe(250)
    expect(toMl(0)).toBe(0)
    expect(toMl('1500')).toBe(1500)
    expect(toMl(' 300 ')).toBe(300)
    expect(toMl(12.5)).toBe(12.5)
  })
  it('turns everything else into 0', () => {
    for (const bad of [null, undefined, NaN, Infinity, -1, '', '  ', 'abc', {}, [], true]) expect(toMl(bad)).toBe(0)
  })
})

// BACKLOG 771: «напоминание — не раньше чем через 3 часа после последнего добавления воды»
describe('useWaterReminder: время последнего добавления воды', () => {
  const HOUR = 60 * 60 * 1000
  const iso = (msAgo: number) => new Date(noon.getTime() - msAgo).toISOString()
  beforeEach(() => {
    localStorage.clear()
    h.fail = false
    h.calls = 0
    h.tables = { metrics: [water], daily_values: [{ value: 700 }] }
    vi.useFakeTimers()
    vi.setSystemTime(noon)
  })

  it('воду добавили час назад (журнал в аккаунте) — плашки нет, и показ не «тратится»', async () => {
    h.tables.water_log = [{ drank_at: iso(1 * HOUR) }]
    const r = useWaterReminder()
    await r.load('u')
    expect(r.visible.value).toBe(false)
    expect(localStorage.getItem(WATER_REMINDER_LAST_KEY)).toBeNull()
  })

  it('последняя добавка была 4 часа назад — плашка показывается', async () => {
    h.tables.water_log = [{ drank_at: iso(4 * HOUR) }]
    const r = useWaterReminder()
    await r.load('u')
    expect(r.visible.value).toBe(true)
  })

  it('ровно 3 часа с последней добавки — уже можно напомнить', async () => {
    h.tables.water_log = [{ drank_at: iso(3 * HOUR) }]
    const r = useWaterReminder()
    await r.load('u')
    expect(r.visible.value).toBe(true)
  })

  it('журнала нет или он пуст (миграция 036 не применена / воды ещё не было) — правило как раньше: плашка показывается', async () => {
    delete h.tables.water_log
    const a = useWaterReminder()
    await a.load('u')
    expect(a.visible.value).toBe(true)
    localStorage.clear()
    h.tables.water_log = []
    const b = useWaterReminder()
    await b.load('u')
    expect(b.visible.value).toBe(true)
  })

  it('журнала в аккаунте нет, но запись этого устройства свежая (+200 мл полчаса назад) — плашки нет', async () => {
    saveStack('u', todayStr(), [{ prev: 500, next: 700, at: noon.getTime() - 30 * 60 * 1000 }])
    const r = useWaterReminder()
    await r.load('u')
    expect(r.visible.value).toBe(false)
  })

  it('правка суммы вниз (минус) не считается «добавлением воды»', async () => {
    saveStack('u', todayStr(), [{ prev: 900, next: 700, at: noon.getTime() - 30 * 60 * 1000 }])
    const r = useWaterReminder()
    await r.load('u')
    expect(r.visible.value).toBe(true)
  })

  it('берётся самая свежая из двух отметок: старая в журнале, свежая на устройстве — плашки нет', async () => {
    h.tables.water_log = [{ drank_at: iso(5 * HOUR) }]
    saveStack('u', todayStr(), [{ prev: 500, next: 700, at: noon.getTime() - 20 * 60 * 1000 }])
    const r = useWaterReminder()
    await r.load('u')
    expect(r.visible.value).toBe(false)
  })

  it('запись «из будущего» (время выбрано вручную / часы переведены назад) плашку не блокирует навсегда', async () => {
    h.tables.water_log = [{ drank_at: new Date(noon.getTime() + 2 * HOUR).toISOString() }]
    const r = useWaterReminder()
    await r.load('u')
    expect(r.visible.value).toBe(true)
  })
})
