import { describe, expect, it } from 'vitest'
import { computeStreakItemsPure } from './streaks'
import { metricCountsInDay, metricExpectedOn } from './metrics'
import { addDays, fmtDate } from './date'
import type { Metric } from './types'

// Пропуск дня метрики (BACKLOG 47.3, миграция 061): «пропущенный день» = метрика в эту дату НЕ нужна — серию не рвёт и не растит.
// Числа ниже — те же, что в SQL-сценарии scenario_061_skipped_days.sql (паритет клиента и сервера).
const today = new Date(2026, 9, 8)
const day = (offset: number) => fmtDate(addDays(today, offset))
const metric = (id: string, over: Partial<Metric> = {}): Metric =>
  ({ id, user_id: 'u1', name: id, icon: null, type: 'boolean', unit: null, goal_value: null, goal_direction: null, schedule: null, category_id: null, position: 0, ...over }) as Metric
const byDay = (rows: Record<string, string[]>): Record<string, Record<string, unknown>> => {
  const out: Record<string, Record<string, unknown>> = {}
  for (const [id, days] of Object.entries(rows)) for (const d of days) (out[d] ||= {})[id] = true
  return out
}
const perfect = (metrics: Metric[], data: Record<string, Record<string, unknown>>) => computeStreakItemsPure(metrics, data, new Set(), today).find((i) => i.kind === 'perfect_days')?.streak ?? 0
const own = (metrics: Metric[], data: Record<string, Record<string, unknown>>, id: string) => computeStreakItemsPure(metrics, data, new Set(), today).find((i) => i.kind === 'metric' && i.metric?.id === id)?.streak ?? 0

describe('metricExpectedOn / metricCountsInDay с пропуском', () => {
  it('пропущенная дата — не нужна; остальные даты как раньше', () => {
    const m = metric('a', { skipped_days: [day(-1)] })
    expect(metricExpectedOn(m, day(-1))).toBe(false)
    expect(metricExpectedOn(m, day(0))).toBe(true)
    expect(metricExpectedOn(metric('b'), day(-1))).toBe(true)
    expect(metricExpectedOn(metric('c', { skipped_days: null }), day(-1))).toBe(true)
  })
  it('в «процент дня» пропущенная метрика входит только если всё же выполнена (бонус, а не штраф)', () => {
    const m = metric('a', { skipped_days: [day(-1)] })
    expect(metricCountsInDay(m, day(-1), false)).toBe(false)
    expect(metricCountsInDay(m, day(-1), true)).toBe(true)
  })
  it('пропуск не мешает расписанию по дням недели', () => {
    const wd = (d: string) => new Date(d + 'T00:00:00').getDay()
    const m = metric('a', { schedule: { type: 'days', days: [wd(day(-2))] } as never, skipped_days: [day(-2)] })
    expect(metricExpectedOn(m, day(-2))).toBe(false) // по расписанию нужен, но пропущен
  })
})

describe('серии с пропуском (паритет с SQL-сценарием 061)', () => {
  it('A: одна метрика, вчера не выполнена — без пропуска серия 1, с пропуском 3 (сегодня, позавчера, ещё день)', () => {
    const data = byDay({ a: [day(0), day(-2), day(-3)] })
    expect(perfect([metric('a')], data)).toBe(1)
    expect(perfect([metric('a', { skipped_days: [day(-1)] })], data)).toBe(3)
  })
  it('A: серия самой метрики ведёт себя так же', () => {
    const data = byDay({ a: [day(0), day(-2), day(-3)] })
    expect(own([metric('a')], data, 'a')).toBe(1)
    expect(own([metric('a', { skipped_days: [day(-1)] })], data, 'a')).toBe(3)
  })
  it('B: две метрики, M2 вчера не выполнена и пропущена, M1 вчера выполнена — день идеальный: серия 3', () => {
    const data = byDay({ m1: [day(0), day(-1), day(-2)], m2: [day(0), day(-2)] })
    expect(perfect([metric('m1'), metric('m2')], data)).toBe(1)
    expect(perfect([metric('m1'), metric('m2', { skipped_days: [day(-1)] })], data)).toBe(3)
  })
  it('C: день пропущен целиком — не рвёт и не растит (сегодня + позавчера = 2)', () => {
    const data = byDay({ a: [day(0), day(-2)] })
    expect(perfect([metric('a', { skipped_days: [day(-1)] })], data)).toBe(2)
  })
  it('пропущенный, но всё же выполненный день: «идеальный день» его не растит (как день вне расписания — и на сервере), серия самой метрики — растит', () => {
    const data = byDay({ a: [day(0), day(-1), day(-2)] })
    const m = metric('a', { skipped_days: [day(-1)] })
    expect(perfect([m], data)).toBe(2) // день без обязательных метрик: не рвёт и не растит
    expect(own([m], data, 'a')).toBe(3) // метрика выполнена в этот день — это её серия
  })
  it('пропуск не помогает за пределами пропущенной даты: позавчера не выполнено — серия рвётся там', () => {
    const data = byDay({ a: [day(0)] })
    expect(perfect([metric('a', { skipped_days: [day(-1)] })], data)).toBe(1)
  })
})
