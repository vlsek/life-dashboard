import { describe, expect, it } from 'vitest'
import { ACHIEVEMENTS, computeCounters, evaluate } from './achievements'
import { computeWeekProgressPure, countMegaWeeks, getWeekDates, progressPercent, weekBonusPct, type DayProgressSettings, type PlannedItem } from './weekProgress'
import type { Metric } from './types'

const ON: DayProgressSettings = { enabled: true, includePlanned: true, includeMetrics: true }
const metric = (id: string, over: Partial<Metric> = {}) => ({ id, name: id, type: 'boolean', active: true, schedule: null, count_streak: true, ...over }) as unknown as Metric

// 2026-10-05 — понедельник; неделя 28.09–04.10 уже прошла, текущая — 05.10–11.10
const TODAY = new Date('2026-10-08T12:00:00')
const WEEK = ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']

const allDone = (ids: string[], dates: string[]) => dates.flatMap((date) => ids.map((metric_id) => ({ date, metric_id, value: true as never })))
const star = (text: string, done = true): PlannedItem => ({ text, done, bonus: true })

describe('бонус и процент недели (копия расчёта Дашборда)', () => {
  it('бонус недели — +20%/7 за каждый выполненный ⭐-пункт, одна цифра после запятой', () => {
    expect(weekBonusPct(0)).toBe(0)
    expect(weekBonusPct(1)).toBe(2.9)
    expect(weekBonusPct(7)).toBe(20)
  })
  it('процент = база + бонус; сто процентов базы без бонуса — ровно 100, не больше', () => {
    expect(progressPercent({ done: 7, total: 7, bonusPct: 0 })).toBe(100)
    expect(progressPercent({ done: 7, total: 7, bonusPct: 8.6 })).toBe(109)
    expect(progressPercent({ done: 0, total: 0, bonusPct: 5 })).toBe(5)
  })
  it('getWeekDates — понедельник…воскресенье', () => {
    expect(getWeekDates(new Date('2026-10-03T10:00:00'))).toEqual(WEEK)
    expect(getWeekDates(new Date('2026-09-28T00:30:00'))[0]).toBe('2026-09-28')
  })
  it('computeWeekProgressPure: выключенный прогресс — null; метрики считаются по дням', () => {
    const m = [metric('a')]
    const values = Object.fromEntries(WEEK.map((d, i) => [d, i < 3 ? { a: true } : {}])) as never
    expect(computeWeekProgressPure({ ...ON, enabled: false }, m, values, WEEK, {}, [])).toBeNull()
    expect(computeWeekProgressPure(ON, m, values, WEEK, {}, [])).toMatchObject({ done: 3, total: 7, bonusPct: 0 })
  })
})

describe('countMegaWeeks — закончено недель больше чем на 100%', () => {
  const base = { metrics: [metric('a'), metric('b')], goals: [], settings: ON, today: TODAY }

  it('все метрики недели сделаны + два ⭐-пункта плана → неделя выше 100%, считается', () => {
    const planned = [{ date: WEEK[1], planned_goals: [star('x')] }, { date: WEEK[4], planned_goals: [star('y')] }]
    expect(countMegaWeeks({ ...base, values: allDone(['a', 'b'], WEEK), planned })).toBe(1)
  })

  it('ровно 100% без бонуса — не мега', () => {
    expect(countMegaWeeks({ ...base, values: allDone(['a', 'b'], WEEK), planned: [] })).toBe(0)
  })

  it('бонус есть, но база просела (сделана половина) — не мега', () => {
    const half = allDone(['a', 'b'], WEEK.slice(0, 3))
    expect(countMegaWeeks({ ...base, values: half, planned: [{ date: WEEK[0], planned_goals: [star('x'), star('y')] }] })).toBe(0)
  })

  it('невыполненный ⭐-пункт бонуса не даёт', () => {
    expect(countMegaWeeks({ ...base, values: allDone(['a', 'b'], WEEK), planned: [{ date: WEEK[0], planned_goals: [star('x', false), star('y', false)] }] })).toBe(0)
  })

  it('текущая неделя не считается — «закончить неделю»; и неделя до первой активности тоже', () => {
    const cur = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08']
    expect(countMegaWeeks({ ...base, values: allDone(['a', 'b'], cur), planned: [{ date: cur[0], planned_goals: [star('x'), star('y')] }] })).toBe(0)
    expect(countMegaWeeks({ ...base, values: [], planned: [] })).toBe(0)
  })

  it('несколько недель считаются по отдельности', () => {
    const prev = ['2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27']
    const values = [...allDone(['a', 'b'], prev), ...allDone(['a', 'b'], WEEK)]
    const planned = [{ date: prev[0], planned_goals: [star('p'), star('q')] }, { date: WEEK[0], planned_goals: [star('x'), star('y')] }]
    expect(countMegaWeeks({ ...base, values, planned })).toBe(2)
  })

  it('пункт-цель с ⭐: выполненная цель даёт бонус (100% + 2,9% → мега), невыполненная и удалённая — нет', () => {
    const planned = (text: string) => [{ date: WEEK[0], planned_goals: [{ type: 'goal', text, bonus: true }] }]
    const values = allDone(['a', 'b'], WEEK)
    expect(countMegaWeeks({ ...base, values, planned: planned('Цель'), goals: [{ name: 'Цель', done: true, stages: 1 }] })).toBe(1)
    expect(countMegaWeeks({ ...base, values, planned: planned('Цель'), goals: [{ name: 'Цель', done: false, stages: 1 }] })).toBe(0)
    expect(countMegaWeeks({ ...base, values, planned: planned('Удалена'), goals: [{ name: 'Цель', done: true, stages: 1 }] })).toBe(0)
  })

  it('многоэтапная цель с ⭐ считается выполненной только когда пройдены все этапы', () => {
    const planned = [{ date: WEEK[0], planned_goals: [{ type: 'goal', text: 'Марафон', bonus: true }] }]
    const values = allDone(['a', 'b'], WEEK)
    expect(countMegaWeeks({ ...base, values, planned, goals: [{ name: 'Марафон', done: false, stages: 3, current_stage: 2 }] })).toBe(0)
    expect(countMegaWeeks({ ...base, values, planned, goals: [{ name: 'Марафон', done: true, stages: 3, current_stage: 3 }] })).toBe(1)
  })

  it('прогресс выключен в настройках — всегда 0', () => {
    const planned = [{ date: WEEK[0], planned_goals: [star('x'), star('y')] }]
    expect(countMegaWeeks({ ...base, settings: { ...ON, enabled: false }, values: allDone(['a', 'b'], WEEK), planned })).toBe(0)
  })
})

describe('достижение «Мега продуктивность» в реестре', () => {
  it('есть в реестре: порог 1 неделя, счётчик megaWeeks', () => {
    const def = ACHIEVEMENTS.find((a) => a.key === 'mega_productivity')!
    expect(def).toMatchObject({ group: 'weeks', counter: 'megaWeeks', target: 1 })
  })
  it('открывается, когда закончена хотя бы одна неделя выше 100%, и не открывается без неё', () => {
    const mk = (megaWeeks: number) => computeCounters({ metrics: [], values: [], doneGoals: [], masteredSkills: [], doneBooks: [], weightEntries: 0, workoutDates: [], challengesDone: 0, megaWeeks, today: TODAY })
    expect(evaluate(mk(0)).find((s) => s.def.key === 'mega_productivity')!.met).toBe(false)
    expect(evaluate(mk(1)).find((s) => s.def.key === 'mega_productivity')!.met).toBe(true)
    expect(mk(undefined as never).megaWeeks).toBe(0)
  })
})
