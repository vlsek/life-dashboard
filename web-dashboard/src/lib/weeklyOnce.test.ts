import { describe, expect, it } from 'vitest'
import { computeDayProgressPure, computeWeekProgressPure } from './progress'
import { computeStreakItemsPure } from './streaks'
import { buildSchedule } from './metricsManager'
import { metricExpectedOn, metricSchedule } from './metrics'
import type { DayProgressSettings } from './progressSettings'
import type { Metric } from './types'

// BACKLOG 4.2 «Еженедельные метрики»: замерять параметр не каждый день, а 1 раз в неделю (например, вес).
// Это уже умеет расписание «Не менее N раз в неделю» при N = 1 — тесты фиксируют именно сценарий «раз в неделю»,
// чтобы будущие правки расписаний его не сломали.
const SETTINGS: DayProgressSettings = { enabled: true, includePlanned: true, includeMetrics: true, dayPlace: 'avatar', weekPlace: 'profile' }
const weight = (over: Partial<Metric> = {}): Metric =>
  ({ id: 'w', user_id: 'u', name: 'Вес', icon: 'svg:scale', type: 'number', unit: 'кг', goal_value: null, goal_direction: null, schedule: { type: 'weekly', min: 1 }, category_id: null, position: 0, ...over }) as Metric
const WEEK = ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'] // пн–вс
const D = (iso: string) => new Date(iso + 'T00:00:00')

describe('метрика «раз в неделю» (вес)', () => {
  it('форма: «Не менее N раз в неделю» с N=1 даёт расписание weekly/1; N<1 и мусор приводятся к 1, больше 7 — к 7', () => {
    const base = { scheduleKind: 'weekly' as const, days: [], atMostMax: 0 }
    expect(buildSchedule({ ...base, weeklyMin: 1 })).toEqual({ type: 'weekly', min: 1 })
    expect(buildSchedule({ ...base, weeklyMin: 0 })).toEqual({ type: 'weekly', min: 1 })
    expect(buildSchedule({ ...base, weeklyMin: Number.NaN })).toEqual({ type: 'weekly', min: 1 })
    expect(buildSchedule({ ...base, weeklyMin: 99 })).toEqual({ type: 'weekly', min: 7 })
    expect(metricSchedule(weight())).toEqual({ type: 'weekly', min: 1 })
  })

  it('не привязана к дню недели: внести можно в любой день', () => {
    for (const d of WEEK) expect(metricExpectedOn(weight(), d)).toBe(false)
  })

  it('неделя без замера — 0 из 1; замер в любой день недели — 1 из 1; несколько замеров больше не засчитываются', () => {
    const none = computeWeekProgressPure(SETTINGS, [weight()], {}, WEEK, {}, [])
    expect(none).toEqual({ done: 0, total: 1, bonusPct: 0 })
    for (const d of [WEEK[0], WEEK[3], WEEK[6]]) {
      const res = computeWeekProgressPure(SETTINGS, [weight()], { [d]: { w: 82.4 } }, WEEK, {}, [])
      expect(res, `замер ${d}`).toEqual({ done: 1, total: 1, bonusPct: 0 })
    }
    const many = Object.fromEntries(WEEK.map((d) => [d, { w: 82 }]))
    expect(computeWeekProgressPure(SETTINGS, [weight()], many, WEEK, {}, [])).toEqual({ done: 1, total: 1, bonusPct: 0 })
  })

  it('в процент ДНЯ не входит: пропуск замера в остальные дни не штрафуется, а сделанный в этот день — бонус', () => {
    expect(computeDayProgressPure(SETTINGS, [weight()], {}, '2026-09-29', [], [])).toEqual({ done: 0, total: 0, bonusPct: 0 })
    expect(computeDayProgressPure(SETTINGS, [weight()], { w: 82.4 }, '2026-09-30', [], [])).toEqual({ done: 1, total: 1, bonusPct: 0 })
  })

  it('серия считается неделями, а не днями: «каждый день взвешиваться» не требуется', () => {
    // сегодня среда; замеры: в эту неделю (ср) и в прошлую (ср) — серия 2 недели, в единицах недель
    const byDay = { '2026-09-30': { w: 82.4 }, '2026-09-23': { w: 82.9 } }
    const items = computeStreakItemsPure([weight()], byDay, new Set(), D('2026-09-30'))
    const s = items.find((i) => i.kind === 'metric')
    expect(s?.unit).toBe('w')
    expect(s?.streak).toBe(2)
  })

  it('пропущенная неделя обрывает серию', () => {
    const byDay = { '2026-09-30': { w: 82.4 }, '2026-09-16': { w: 83 } } // между ними целая неделя без замера
    const items = computeStreakItemsPure([weight()], byDay, new Set(), D('2026-09-30'))
    expect(items.find((i) => i.kind === 'metric')?.streak).toBe(1)
  })
})
