import { describe, it, expect } from 'vitest'
import {
  computeStreak,
  computeStreakSkipping,
  computeWeeklyStreak,
  computeAtMostWeeklyStreak,
  computeStreakItemsPure,
  weekStartStr,
} from './streaks'
import type { Metric } from './types'

const D = (iso: string) => new Date(iso + 'T00:00:00')

function metric(overrides: Partial<Metric>): Metric {
  return {
    id: 'm1',
    user_id: 'u1',
    name: 'Test',
    icon: null,
    type: 'boolean',
    unit: null,
    goal_value: null,
    goal_direction: null,
    schedule: null,
    category_id: null,
    position: 0,
    ...overrides,
  }
}

describe('computeStreak', () => {
  it('counts consecutive days backward from fromDate', () => {
    const set = new Set(['2026-09-28', '2026-09-27', '2026-09-26'])
    expect(computeStreak(set, D('2026-09-28'))).toBe(3)
  })
  it('stops at the first missing day', () => {
    const set = new Set(['2026-09-28', '2026-09-26']) // пропущено 27-е
    expect(computeStreak(set, D('2026-09-28'))).toBe(1)
  })
  it('is 0 if fromDate itself is missing', () => {
    expect(computeStreak(new Set(['2026-09-27']), D('2026-09-28'))).toBe(0)
  })
})

describe('computeStreakSkipping', () => {
  it('a skip day does not break the streak and is not counted', () => {
    const doneSet = new Set(['2026-09-28', '2026-09-26']) // 27-е — "выходной" (isSkip)
    const isSkip = (d: string) => d === '2026-09-27'
    expect(computeStreakSkipping(doneSet, isSkip, D('2026-09-28'))).toBe(2)
  })
  it('a non-skip, non-done day breaks the streak', () => {
    const doneSet = new Set(['2026-09-28'])
    const isSkip = () => false
    expect(computeStreakSkipping(doneSet, isSkip, D('2026-09-28'))).toBe(1)
  })
})

describe('computeWeeklyStreak', () => {
  it('current week counts even if not yet met, without breaking the streak', () => {
    // неделя 2026-09-21..27 (пн-вс): 3 из min=3 — засчитана; текущая неделя (с 28-го) — 1 из 3, не добрана
    const doneDays = ['2026-09-21', '2026-09-22', '2026-09-23', '2026-09-28']
    const res = computeWeeklyStreak(doneDays, 3, D('2026-09-28'))
    expect(res.streak).toBe(1) // прошлая неделя засчитана
    expect(res.atRisk).toBe(false) // 28-е понедельник, 6 дней впереди на добор 2 недостающих
  })
  it('atRisk true when remaining days cannot cover what is still needed', () => {
    // Воскресенье, норма 3/нед., пока 0 — остался только сегодняшний день на 3 выполнения: невозможно
    const res = computeWeeklyStreak([], 3, D('2026-09-27')) // воскресенье
    expect(res.atRisk).toBe(true)
  })
})

describe('computeAtMostWeeklyStreak', () => {
  it('counts a week that stayed within the limit', () => {
    const counts = { [weekStartStr('2026-09-21')]: 1 } // 1 <= max 2
    const res = computeAtMostWeeklyStreak(counts, 2, D('2026-09-28'), '2026-09-21')
    expect(res.streak).toBe(2) // текущая (0 использований) + прошлая (1 <= 2)
  })
  it('atRisk when the current week is already at the limit', () => {
    const counts = { [weekStartStr('2026-09-28')]: 2 }
    const res = computeAtMostWeeklyStreak(counts, 2, D('2026-09-28'), '2026-09-21')
    expect(res.atRisk).toBe(true)
  })
})

describe('computeStreakItemsPure', () => {
  const today = D('2026-09-28') // понедельник, заполнен

  it('perfect_days: counted when all metrics expected that day are done', () => {
    const m = metric({ id: 'm1' })
    const byDay = {
      '2026-09-28': { m1: true },
      '2026-09-27': { m1: true },
    }
    const items = computeStreakItemsPure([m], byDay, new Set(), today)
    const perfect = items.find((i) => i.kind === 'perfect_days')
    expect(perfect?.streak).toBe(2)
    expect(perfect?.todayCounted).toBe(true)
  })

  it('per-metric streak uses the metric id to read byDay values', () => {
    const m = metric({ id: 'm1', name: 'Push-ups' })
    const byDay = {
      '2026-09-28': { m1: true },
      '2026-09-27': { m1: true },
      '2026-09-26': { m1: false },
    }
    const items = computeStreakItemsPure([m], byDay, new Set(), today)
    const metricItem = items.find((i) => i.kind === 'metric' && i.metric?.id === 'm1')
    expect(metricItem?.streak).toBe(2)
  })

  it('streak_import_days is added on top only when the computed streak reaches the import date unbroken', () => {
    const m = metric({ id: 'm1', streak_import_days: 100, streak_import_date: '2026-09-27' })
    const byDay = { '2026-09-28': { m1: true }, '2026-09-27': { m1: true } }
    const items = computeStreakItemsPure([m], byDay, new Set(), today)
    const metricItem = items.find((i) => i.kind === 'metric')
    expect(metricItem?.streak).toBe(102) // 2 посчитанных + 100 импортированных
  })

  it('streak_import_days is NOT added if the streak breaks before reaching the import date', () => {
    const m = metric({ id: 'm1', streak_import_days: 100, streak_import_date: '2026-09-01' })
    const byDay = { '2026-09-28': { m1: true } } // только сегодня, стрик = 1, не доходит до 09-01
    const items = computeStreakItemsPure([m], byDay, new Set(), today)
    const metricItem = items.find((i) => i.kind === 'metric')
    expect(metricItem?.streak).toBe(1)
  })

  it('note_filled: tracked separately from metrics (counted from today when today\'s note is filled)', () => {
    // BACKLOG 22.1: точка отсчёта у заметки своя — по самой заметке, а не по тому, есть ли за сегодня записи метрик.
    // Здесь byDay[today] есть, но результат от этого больше не зависит (см. отдельные тесты ниже).
    const byDay = { '2026-09-28': {} }
    const items = computeStreakItemsPure([], byDay, new Set(['2026-09-28', '2026-09-27']), today)
    const note = items.find((i) => i.kind === 'note_filled')
    expect(note?.streak).toBe(2)
    expect(note?.todayCounted).toBe(true)
  })

  it('zero-length streaks are filtered out entirely', () => {
    const items = computeStreakItemsPure([], {}, new Set(), today)
    expect(items.length).toBe(0)
  })

  it('sorts day-based streaks before week-based ones, then by streak length descending', () => {
    const weekly = metric({ id: 'w1', schedule: { type: 'weekly', min: 1 } })
    const daily = metric({ id: 'd1' })
    const byDay = {
      '2026-09-28': { w1: true, d1: true },
      '2026-09-27': { d1: true },
    }
    const items = computeStreakItemsPure([weekly, daily], byDay, new Set(), today)
    // все day-unit (undefined) идут перед week-unit ('w')
    const firstWeekIdx = items.findIndex((i) => i.unit === 'w')
    const lastDayIdx = items.map((i) => i.unit).lastIndexOf(undefined)
    expect(firstWeekIdx).toBeGreaterThan(lastDayIdx)
  })
})

// BACKLOG 14 (11:15): метрика с выключенным «считать серию» (count_streak = false, миграция 031)
describe('count_streak = false', () => {
  const today = D('2026-09-30')
  const days = (n: number, ids: string[]) => {
    const by: Record<string, Record<string, unknown>> = {}
    for (let i = 0; i < n; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      by[iso] = Object.fromEntries(ids.map((id) => [id, true]))
    }
    return by
  }
  it('gives no per-metric streak to a metric with the streak switched off', () => {
    const on = metric({ id: 'a', name: 'Read' })
    const off = metric({ id: 'b', name: 'Weight', count_streak: false })
    const items = computeStreakItemsPure([on, off], days(5, ['a', 'b']), new Set(), today)
    const ids = items.filter((i) => i.kind === 'metric').map((i) => i.metric!.id)
    expect(ids).toEqual(['a'])
  })
  it('does not require such a metric for the "perfect day" streak', () => {
    const on = metric({ id: 'a' })
    const off = metric({ id: 'b', count_streak: false })
    // «b» (вес) не вносится никогда — серия идеальных дней при этом не рвётся
    const items = computeStreakItemsPure([on, off], days(6, ['a']), new Set(), today)
    expect(items.find((i) => i.kind === 'perfect_days')?.streak).toBe(6)
  })
  it('still requires metrics whose flag is true or missing', () => {
    const a = metric({ id: 'a' })
    const b = metric({ id: 'b', count_streak: true })
    const items = computeStreakItemsPure([a, b], days(4, ['a']), new Set(), today)
    expect(items.find((i) => i.kind === 'perfect_days')).toBeUndefined()
  })
  it('keeps the streak of a metric whose flag is null (column present but unset)', () => {
    const a = metric({ id: 'a', count_streak: null })
    const items = computeStreakItemsPure([a], days(3, ['a']), new Set(), today)
    expect(items.some((i) => i.kind === 'metric' && i.metric?.id === 'a' && i.streak === 3)).toBe(true)
  })
})

// BACKLOG 22.1 🐞 «пунктир огонька пропал»: точка отсчёта у каждой серии своя
describe('computeStreakItemsPure: today not counted yet (dashed flame)', () => {
  const today = D('2026-09-30')
  const prev = (n: number) => {
    const d = new Date(today)
    d.setDate(d.getDate() - n)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
  const find = (items: ReturnType<typeof computeStreakItemsPure>, kind: string, id?: string) =>
    items.find((i) => i.kind === kind && (id === undefined || i.metric?.id === id))

  it('an entry of ANOTHER metric today does not wipe the unfinished series (they stay as "at risk")', () => {
    const a = metric({ id: 'a', name: 'Read' })
    const b = metric({ id: 'b', name: 'Run' })
    const byDay: Record<string, Record<string, unknown>> = { [prev(0)]: { a: true } }
    for (let i = 1; i <= 5; i++) byDay[prev(i)] = { a: true, b: true }
    const items = computeStreakItemsPure([a, b], byDay, new Set(), today)
    // «a» выполнена сегодня — серия 6 и засчитана
    expect(find(items, 'metric', 'a')).toMatchObject({ streak: 6, todayCounted: true })
    // «b» сегодня не выполнена — серия 5 НЕ обнулена и помечена как «сегодня не готово»
    expect(find(items, 'metric', 'b')).toMatchObject({ streak: 5, todayCounted: false })
    // идеальный день: 5 дней подряд, сегодня ещё не завершён
    expect(find(items, 'perfect_days')).toMatchObject({ streak: 5, todayCounted: false })
  })

  it('any unrelated value today (e.g. water) keeps the metric streak and marks it not counted', () => {
    const m = metric({ id: 'm1' })
    const byDay: Record<string, Record<string, unknown>> = { [prev(0)]: { water: 250 } }
    for (let i = 1; i <= 3; i++) byDay[prev(i)] = { m1: true }
    const items = computeStreakItemsPure([m], byDay, new Set(), today)
    expect(find(items, 'metric', 'm1')).toMatchObject({ streak: 3, todayCounted: false })
  })

  it('a metric explicitly saved as not done today does not reset its streak either', () => {
    const m = metric({ id: 'm1' })
    const byDay: Record<string, Record<string, unknown>> = { [prev(0)]: { m1: false } }
    for (let i = 1; i <= 4; i++) byDay[prev(i)] = { m1: true }
    const items = computeStreakItemsPure([m], byDay, new Set(), today)
    expect(find(items, 'metric', 'm1')).toMatchObject({ streak: 4, todayCounted: false })
  })

  it('nothing entered today: same as before — counted from yesterday, not counted', () => {
    const m = metric({ id: 'm1' })
    const byDay: Record<string, Record<string, unknown>> = {}
    for (let i = 1; i <= 2; i++) byDay[prev(i)] = { m1: true }
    const items = computeStreakItemsPure([m], byDay, new Set(), today)
    expect(find(items, 'metric', 'm1')).toMatchObject({ streak: 2, todayCounted: false })
    expect(find(items, 'perfect_days')).toMatchObject({ streak: 2, todayCounted: false })
  })

  it('a series that is done today counts today whether or not the byDay row looks "empty"', () => {
    const m = metric({ id: 'm1' })
    const byDay: Record<string, Record<string, unknown>> = { [prev(0)]: { m1: true }, [prev(1)]: { m1: true } }
    expect(find(computeStreakItemsPure([m], byDay, new Set(), today), 'metric', 'm1')).toMatchObject({ streak: 2, todayCounted: true })
  })

  it('note_filled: today\'s note counts even when there are no metric rows today (it used to be one day short)', () => {
    const byDay: Record<string, Record<string, unknown>> = {}
    const notes = new Set([prev(0), prev(1), prev(2)])
    expect(find(computeStreakItemsPure([], byDay, notes, today), 'note_filled')).toMatchObject({ streak: 3, todayCounted: true })
  })

  it('note_filled: an unfilled note today with other entries today keeps the earlier streak (not reset to 0)', () => {
    const byDay: Record<string, Record<string, unknown>> = { [prev(0)]: { m1: true } }
    const notes = new Set([prev(1), prev(2)])
    expect(find(computeStreakItemsPure([], byDay, notes, today), 'note_filled')).toMatchObject({ streak: 2, todayCounted: false })
  })

  it('a rest day (metric not expected today) counts as covered and does not break the streak', () => {
    // метрика по расписанию только пн–пт; 2026-09-30 — среда, а проверим субботу как «сегодня»
    const sat = D('2026-09-26')
    const m = metric({ id: 'm1', schedule: { type: 'days', days: [1, 2, 3, 4, 5] } as Metric['schedule'] })
    const byDay: Record<string, Record<string, unknown>> = { '2026-09-25': { m1: true }, '2026-09-24': { m1: true } }
    const items = computeStreakItemsPure([m], byDay, new Set(), sat)
    expect(find(items, 'metric', 'm1')).toMatchObject({ streak: 2, todayCounted: true })
  })

  it('the imported streak is still added when the series is at risk today (counted from yesterday)', () => {
    const m = metric({ id: 'm1', streak_import_days: 10, streak_import_date: prev(2) })
    const byDay: Record<string, Record<string, unknown>> = { [prev(0)]: { other: 1 }, [prev(1)]: { m1: true }, [prev(2)]: { m1: true } }
    const item = find(computeStreakItemsPure([m], byDay, new Set(), today), 'metric', 'm1')
    expect(item).toMatchObject({ streak: 12, todayCounted: false })
  })
})
