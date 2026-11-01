import { describe, expect, it } from 'vitest'
import { buildJournal, fmtDay, journalSince } from './sparksJournal'

const today = '2026-10-30'
const src = (rows: { day: string; metric_id: string; amount: number }[], cap: number | null = 10) => ({ rows, names: { m1: 'Вода', m2: 'Сон' } as Record<string, string>, cap })

describe('журнал огоньков (78.5)', () => {
  it('окно: 30 дней включая сегодня', () => {
    expect(journalSince(today)).toBe('2026-10-01')
    expect(journalSince('2026-03-05')).toBe('2026-02-04')
  })
  it('начисления группируются по дню, дни идут от свежих к старым, итоги считаются', () => {
    const j = buildJournal(src([
      { day: '2026-10-28', metric_id: 'm1', amount: 1 },
      { day: '2026-10-29', metric_id: 'm1', amount: 1 },
      { day: '2026-10-29', metric_id: 'm2', amount: 1 },
    ]), [], today)
    expect(j.days.map((d) => d.day)).toEqual(['2026-10-29', '2026-10-28'])
    expect(j.days[0].earned).toBe(2)
    expect(j.days[0].from.map((f) => f.name)).toEqual(['Вода', 'Сон'])
    expect(j.earned).toBe(3)
    expect(j.spent).toBe(0)
  })
  it('вне окна, будущие дни и нулевые суммы не учитываются', () => {
    const j = buildJournal(src([
      { day: '2026-09-30', metric_id: 'm1', amount: 1 },
      { day: '2026-10-31', metric_id: 'm1', amount: 1 },
      { day: '2026-10-10', metric_id: 'm1', amount: 0 },
    ]), [], today)
    expect(j.days).toHaveLength(0)
  })
  it('удалённая метрика остаётся в журнале без названия', () => {
    const j = buildJournal(src([{ day: '2026-10-29', metric_id: 'gone', amount: 1 }]), [], today)
    expect(j.days[0].from[0].name).toBeNull()
    expect(j.earned).toBe(1)
  })
  it('потолок дня: отмечается, только когда начислено не меньше потолка; без потолка не отмечается', () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({ day: '2026-10-29', metric_id: 'm' + i, amount: 1 }))
    expect(buildJournal(src(rows, 10), [], today).days[0].capped).toBe(true)
    expect(buildJournal(src(rows.slice(0, 9), 10), [], today).days[0].capped).toBe(false)
    expect(buildJournal(src(rows, null), [], today).days[0].capped).toBe(false)
  })
  it('траты: покупки в окне попадают в свой день и в итог; бесплатные и вне окна — нет', () => {
    const j = buildJournal(src([{ day: '2026-10-29', metric_id: 'm1', amount: 1 }]), [
      { name: 'Кофе', cost: 5, date: '2026-10-29' },
      { name: 'Книга', cost: 12, date: '2026-10-20' },
      { name: 'Подарок', cost: 0, date: '2026-10-25' },
      { name: 'Старое', cost: 7, date: '2026-08-01' },
    ], today)
    expect(j.spent).toBe(17)
    expect(j.days.find((d) => d.day === '2026-10-29')!.bought).toEqual([{ name: 'Кофе', cost: 5 }])
    expect(j.days.map((d) => d.day)).toEqual(['2026-10-29', '2026-10-20'])
  })
  it('fmtDay: ДД.ММ', () => expect(fmtDay('2026-10-05')).toBe('05.10'))
})
