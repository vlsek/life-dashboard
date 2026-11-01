import { describe, expect, it } from 'vitest'
import { buildYearTimeline, timelineTotals } from './timeline'
import type { Milestone } from './types'

const TODAY = new Date(2026, 5, 15) // 15 июня 2026
const ms = (p: Partial<Milestone>): Milestone => ({ id: 'm1', user_id: 'u', name: 'Замена масла', category: 'Авто', last_date: null, interval_value: null, interval_unit: null, due_date: null, last_km: null, interval_km: null, note: null, history: [], done: false, created_at: '2026-01-01', ...p })
const flat = (items: Milestone[], year = 2026) => buildYearTimeline(items, year, TODAY).flatMap((m) => m.events.map((e) => `${e.date}:${e.kind}`))

describe('buildYearTimeline: прошлое', () => {
  it('записи истории и дата последнего выполнения — «сделано», дубль по дню не повторяется', () => {
    const m = ms({ last_date: '2026-03-10', history: [{ date: '2026-03-10', km: 120000, note: 'масло' }, { date: '2025-09-01', km: null, note: null }] })
    expect(flat([m])).toEqual(['2026-03-10:done'])
    expect(flat([m], 2025)).toEqual(['2025-09-01:done'])
  })
  it('last_date без записи в истории тоже попадает в ленту; закрытые вехи показывают прошлое, но будущего не планируют', () => {
    expect(flat([ms({ last_date: '2026-02-02', done: true, due_date: '2026-08-01' })])).toEqual(['2026-02-02:done'])
  })
})

describe('buildYearTimeline: будущее', () => {
  it('ближайшая дата и повторы по интервалу до конца года', () => {
    const m = ms({ due_date: '2026-07-01', interval_value: 3, interval_unit: 'month' })
    expect(flat([m])).toEqual(['2026-07-01:planned', '2026-10-01:planned'])
  })
  it('ближайшая дата в прошлом — «просрочено», повторы после неё — по датам относительно сегодня', () => {
    const m = ms({ due_date: '2026-05-01', interval_value: 2, interval_unit: 'month' })
    expect(flat([m])).toEqual(['2026-05-01:overdue', '2026-07-01:planned', '2026-09-01:planned', '2026-11-01:planned'])
  })
  it('без интервала — только сама дата; интервал только в километрах даты не добавляет', () => {
    expect(flat([ms({ due_date: '2026-12-31' })])).toEqual(['2026-12-31:planned'])
    expect(flat([ms({ due_date: null, interval_km: 10000 })])).toEqual([])
  })
  it('другой год: повторы доходят и до него, год без событий пуст', () => {
    const m = ms({ due_date: '2026-11-01', interval_value: 1, interval_unit: 'year' })
    expect(flat([m], 2027)).toEqual(['2027-11-01:planned'])
    expect(flat([m], 2030)).toEqual(['2030-11-01:planned'])
    expect(flat([ms({})], 2026)).toEqual([])
  })
  it('предохранитель: интервал в 1 день на много лет не зависает', () => {
    const m = ms({ due_date: '2026-06-20', interval_value: 1, interval_unit: 'day' })
    const r = flat([m], 2026)
    expect(r.length).toBeGreaterThan(150)
    expect(() => flat([m], 2040)).not.toThrow()
  })
})

describe('порядок и итоги', () => {
  it('внутри месяца события по дате, затем по названию; итоги по видам', () => {
    const a = ms({ id: 'a', name: 'Б', due_date: '2026-07-05' })
    const b = ms({ id: 'b', name: 'А', due_date: '2026-07-05' })
    const c = ms({ id: 'c', name: 'В', due_date: '2026-07-02' })
    const months = buildYearTimeline([a, b, c, ms({ id: 'd', last_date: '2026-01-05' })], 2026, TODAY)
    expect(months[6].events.map((e) => e.name)).toEqual(['В', 'А', 'Б'])
    expect(timelineTotals(months)).toEqual({ done: 1, planned: 3, overdue: 0 })
  })
  it('битые данные (нет даты, история не массив) не ломают построение', () => {
    const m = ms({ history: null as never, due_date: 'вчера' as never, last_date: 'x' as never })
    expect(flat([m])).toEqual([])
  })
})
