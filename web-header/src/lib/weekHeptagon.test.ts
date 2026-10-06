import { describe, expect, it } from 'vitest'
import { heptagonSegments } from './ringPlacement'
import { computeWeekDaySegments, getWeekDates, weekDaysAriaLabel } from './progress'
import type { DayProgressSettings } from './progressSettings'
import type { PlannedItem } from './progress'

const S: DayProgressSettings = { enabled: true, includePlanned: true, includeMetrics: false, dayPlace: 'header', weekPlace: 'header', weekShape: 'heptagon' }
const dates = getWeekDates(new Date(2026, 9, 7)) // среда 7 окт 2026
const plan = (...done: boolean[]): PlannedItem[] => done.map((d, i) => ({ text: 'p' + i, done: d }))

describe('computeWeekDaySegments', () => {
  it('7 дней; будущие пустые, сегодня и прошлые считаются своей датой', () => {
    const planned = { [dates[0]]: plan(true, true), [dates[1]]: plan(true, false), [dates[2]]: plan(false, false, false, true), [dates[3]]: plan(true) }
    const segs = computeWeekDaySegments(S, [], {}, dates, dates[2], planned, [])!
    expect(segs).toHaveLength(7)
    expect(segs.map((d) => d.state)).toEqual(['past', 'past', 'today', 'future', 'future', 'future', 'future'])
    expect(segs[0].fill).toBe(1)
    expect(segs[1].fill).toBe(0.5)
    expect(segs[2].fill).toBe(0.25)
    expect(segs[3]).toMatchObject({ fill: 0, total: 0, pct: 0 }) // план на будущий день не заливается
  })
  it('день без пунктов — пустая сторона; бонус ⭐ отдельно от базы', () => {
    const planned = { [dates[0]]: [{ text: 'b', done: true, bonus: true }] }
    const segs = computeWeekDaySegments(S, [], {}, dates, dates[1], planned, [])!
    expect(segs[0]).toMatchObject({ fill: 0, bonus: 0.2, pct: 20 })
    expect(segs[1].fill).toBe(0)
  })
  it('прогресс выключен — null', () => {
    expect(computeWeekDaySegments({ ...S, enabled: false }, [], {}, dates, dates[0], {}, [])).toBeNull()
  })
})

describe('weekDaysAriaLabel', () => {
  it('«Пн 100 %, Вт 60 %», будущие — без процента', () => {
    const segs = computeWeekDaySegments(S, [], {}, dates, dates[1], { [dates[0]]: plan(true), [dates[1]]: plan(true, true, false, false, false) }, [])!
    expect(weekDaysAriaLabel(segs, 'Вс,Пн,Вт,Ср,Чт,Пт,Сб')).toBe('Пн 100 %, Вт 40 %, Ср, Чт, Пт, Сб, Вс')
  })
})

describe('heptagonSegments', () => {
  it('7 сторон, заливка пропорциональна доле, зазор у вершин', () => {
    const half = heptagonSegments(16, 13, [0.5, 1, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0.5], 0)
    expect(half).toHaveLength(7)
    expect(half[0].fx).toBeCloseTo((half[0].x1 + half[0].x2) / 2, 8)
    expect(half[0].fy).toBeCloseTo((half[0].y1 + half[0].y2) / 2, 8)
    expect(half[1].fx).toBeCloseTo(half[1].x2, 8)
    expect(half[2].fx).toBeCloseTo(half[2].x1, 8)
    expect(half[6].bx).toBeCloseTo((half[6].x1 + half[6].x2) / 2, 8)
    const gap = heptagonSegments(16, 13, [1], [], 0.1)
    const full = heptagonSegments(16, 13, [1], [], 0)
    expect(Math.hypot(gap[0].x2 - gap[0].x1, gap[0].y2 - gap[0].y1)).toBeCloseTo(0.8 * Math.hypot(full[0].x2 - full[0].x1, full[0].y2 - full[0].y1), 6)
  })
  it('значения вне 0..1 и NaN обрезаются', () => {
    const s = heptagonSegments(16, 13, [5, -1, NaN], [], 0)
    expect(s[0].fx).toBeCloseTo(s[0].x2, 8)
    expect(s[1].fx).toBeCloseTo(s[1].x1, 8)
    expect(s[2].fx).toBeCloseTo(s[2].x1, 8)
  })
})
