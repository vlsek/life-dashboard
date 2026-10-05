import { describe, expect, it } from 'vitest'
import { PERFECT_DAY_TARGETS, countPerfectDays, isPerfectToday, perfectKey, perfectOutcome } from './perfectDay'
import type { Metric } from './types'

// «Идеальный день» (BACKLOG раздел 36, владелец 2026-10-04): сколько идеальных дней и что выдать/показать в окне
const metric = (id: string, over: Record<string, unknown> = {}) => ({ id, user_id: 'u', name: id, icon: null, type: 'boolean', unit: null, goal_value: null, goal_direction: null, schedule: null, category_id: null, position: 0, ...over }) as unknown as Metric
const d = (n: number) => `2026-10-${String(n).padStart(2, '0')}`
const today = new Date('2026-10-05T12:00:00')
const a = metric('a')
const b = metric('b')

describe('countPerfectDays', () => {
  it('считает идеальные дни не подряд; серия — другое число', () => {
    const bd = { [d(1)]: { a: true, b: true }, [d(2)]: { a: true }, [d(3)]: { a: true, b: true }, [d(5)]: { a: true, b: true } }
    expect(countPerfectDays([a, b], bd, today)).toBe(3)
  })
  it('сегодняшний неполный день не прибавляет; дни после сегодня и метрики count_streak=false не учитываются', () => {
    expect(countPerfectDays([a, b], { [d(5)]: { a: true } }, today)).toBe(0)
    expect(countPerfectDays([a], { [d(6)]: { a: true } }, today)).toBe(0)
    expect(countPerfectDays([a, metric('w', { count_streak: false })], { [d(1)]: { a: true } }, today)).toBe(1)
  })
  it('нет метрик или истории — 0', () => {
    expect(countPerfectDays([], { [d(1)]: { a: true } }, today)).toBe(0)
    expect(countPerfectDays([a], {}, today)).toBe(0)
  })
})

describe('isPerfectToday', () => {
  it('идеален, только когда выполнено всё обязательное на сегодня', () => {
    expect(isPerfectToday([a, b], { a: true, b: true }, d(5))).toBe(true)
    expect(isPerfectToday([a, b], { a: true }, d(5))).toBe(false)
    expect(isPerfectToday([a, b], undefined, d(5))).toBe(false)
  })
  it('нет метрик, участвующих в серии, — не идеальный', () => {
    expect(isPerfectToday([], { a: true }, d(5))).toBe(false)
    expect(isPerfectToday([metric('w', { count_streak: false })], { w: true }, d(5))).toBe(false)
  })
})

describe('perfectOutcome', () => {
  it('первый идеальный день: открывается «первое», до следующего 9 и 10%', () => {
    const o = perfectOutcome(1, new Set())
    expect(o.newTargets).toEqual([1])
    expect(o.next).toEqual({ target: 10, remaining: 9, pct: 10 })
  })
  it('достижение уже есть — ничего не выдаём, показываем только прогресс до следующего', () => {
    const o = perfectOutcome(4, new Set([perfectKey(1)]))
    expect(o.newTargets).toEqual([])
    expect(o.next).toEqual({ target: 10, remaining: 6, pct: 40 })
  })
  it('ровно порог: выдаётся достижение, следующее — следующий порог', () => {
    const o = perfectOutcome(10, new Set([perfectKey(1)]))
    expect(o.newTargets).toEqual([10])
    expect(o.next).toEqual({ target: 30, remaining: 20, pct: 33 })
  })
  it('история уже большая, а хранилище пустое: выдаются все пройденные ступени сразу', () => {
    const o = perfectOutcome(45, new Set())
    expect(o.newTargets).toEqual([1, 10, 30])
    expect(o.next).toEqual({ target: 100, remaining: 55, pct: 45 })
  })
  it('все получены — следующего нет', () => {
    const all = new Set(PERFECT_DAY_TARGETS.map(perfectKey))
    expect(perfectOutcome(150, all)).toEqual({ newTargets: [], next: null })
  })
  it('полоса не показывает 100% до порога (99 вместо 100)', () => {
    expect(perfectOutcome(99, new Set(PERFECT_DAY_TARGETS.map(perfectKey))).next!.pct).toBe(99)
  })
  it('ключи достижений — perfect_days_<порог>', () => {
    expect(PERFECT_DAY_TARGETS.map(perfectKey)).toEqual(['perfect_days_1', 'perfect_days_10', 'perfect_days_30', 'perfect_days_100'])
  })
})
