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

  it('note_filled: tracked separately from metrics (startFrom still keys off byDay, per the original)', () => {
    // Как и в dashboard.js: startFrom определяется по тому, заполнены ли МЕТРИКИ сегодня
    // (byDay), а не по самим заметкам — поэтому даже для note_filled нужен непустой byDay[today],
    // иначе streak "сдвигается" на вчера. Подаём {} — пустой объект, но присутствует (truthy).
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
