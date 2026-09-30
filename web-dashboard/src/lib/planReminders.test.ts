import { describe, it, expect } from 'vitest'
import { dueReminders, nowHHMM, reminderKey } from './planReminders'
import { addCustom, isValidTime, setTimeAt, type PlannedEntry } from './planned'

const D = '2026-09-29'
const at = (h: number, m: number) => new Date(2026, 8, 29, h, m)
const notDone = () => false

describe('isValidTime', () => {
  it('accepts HH:MM 24h only', () => {
    for (const ok of ['00:00', '09:05', '23:59', '15:30']) expect(isValidTime(ok)).toBe(true)
    for (const bad of ['', '9:05', '24:00', '12:60', '12:5', '12:30:00', 'abc', null, undefined, 1230]) expect(isValidTime(bad)).toBe(false)
  })
})

describe('addCustom / setTimeAt', () => {
  it('addCustom stores a valid time and ignores a bad or empty one', () => {
    expect(addCustom([], 'Call', '15:00')[0].time).toBe('15:00')
    expect('time' in addCustom([], 'Call', '')[0]).toBe(false)
    expect('time' in addCustom([], 'Call', '25:99')[0]).toBe(false)
    expect('time' in addCustom([], 'Call')[0]).toBe(false)
  })
  it('setTimeAt sets, changes and removes the field (no empty leftovers)', () => {
    const base: PlannedEntry[] = [{ type: 'custom', text: 'a', done: false }, { type: 'custom', text: 'b', done: false }]
    const set = setTimeAt(base, 1, '10:15')
    expect(set[1].time).toBe('10:15')
    expect(set[0]).toBe(base[0]) // соседний пункт не тронут
    expect(setTimeAt(set, 1, '11:00')[1].time).toBe('11:00')
    const cleared = setTimeAt(set, 1, null)
    expect('time' in cleared[1]).toBe(false)
    expect(cleared[1].text).toBe('b')
    expect('time' in setTimeAt(set, 1, 'мусор')[1]).toBe(false)
  })
  it('setTimeAt keeps the other fields (done, bonus)', () => {
    const out = setTimeAt([{ type: 'custom', text: 'a', done: true, bonus: true }], 0, '08:00')
    expect(out[0]).toEqual({ type: 'custom', text: 'a', done: true, bonus: true, time: '08:00' })
  })
})

describe('nowHHMM', () => {
  it('pads to two digits', () => {
    expect(nowHHMM(at(9, 5))).toBe('09:05')
    expect(nowHHMM(at(0, 0))).toBe('00:00')
    expect(nowHHMM(at(23, 59))).toBe('23:59')
  })
})

describe('dueReminders', () => {
  const plan: PlannedEntry[] = [
    { type: 'custom', text: 'Late', time: '18:00', done: false },
    { type: 'custom', text: 'Early', time: '09:00', done: false },
    { type: 'custom', text: 'No time', done: false },
    { type: 'custom', text: 'Done', time: '08:00', done: true },
  ]
  it('returns items whose time has come, earliest first, indexes point into the plan', () => {
    const due = dueReminders(plan, at(18, 0), D, (e) => !!e.done)
    expect(due.map((d) => d.text)).toEqual(['Early', 'Late'])
    expect(due.map((d) => d.index)).toEqual([1, 0])
  })
  it('the exact minute counts, one minute earlier does not', () => {
    expect(dueReminders(plan, at(17, 59), D, (e) => !!e.done).map((d) => d.text)).toEqual(['Early'])
    expect(dueReminders(plan, at(18, 0), D, (e) => !!e.done).map((d) => d.text)).toContain('Late')
  })
  it('overdue items still come back (page opened after the time)', () => {
    expect(dueReminders(plan, at(23, 30), D, (e) => !!e.done)).toHaveLength(2)
  })
  it('nothing before the first time; items without time or already done never fire', () => {
    expect(dueReminders(plan, at(8, 59), D, (e) => !!e.done)).toEqual([])
  })
  it('isDone from the caller decides (a goal done in the Goals page)', () => {
    const goalPlan: PlannedEntry[] = [{ type: 'goal', text: 'Read', time: '07:00' }]
    expect(dueReminders(goalPlan, at(8, 0), D, notDone)).toHaveLength(1)
    expect(dueReminders(goalPlan, at(8, 0), D, () => true)).toHaveLength(0)
  })
  it('ignores an invalid time stored in the database', () => {
    expect(dueReminders([{ type: 'custom', text: 'x', time: '99:99' }], at(23, 0), D, notDone)).toEqual([])
  })
  it('key is stable when the plan is reordered, and different on another day', () => {
    const e = { text: 'Call', time: '15:00' }
    expect(reminderKey(D, e)).toBe(reminderKey(D, { ...e }))
    expect(reminderKey(D, e)).not.toBe(reminderKey('2026-09-30', e))
  })
})

describe('addCustom: done', () => {
  it('done=true создаёт выполненный пункт, по умолчанию — невыполненный; пустой текст ничего не добавляет', () => {
    expect(addCustom([], 'A', null, true)[0]).toEqual({ type: 'custom', text: 'A', done: true })
    expect(addCustom([], 'A')[0].done).toBe(false)
    expect(addCustom([], '   ', null, true)).toEqual([])
  })
  it('выполненный пункт сразу идёт в базу прогресса дня (done++ и total++)', async () => {
    const { computeDayProgressPure } = await import('./progress')
    const plan = addCustom([], 'Сделал не по плану', null, true)
    const res = computeDayProgressPure({ enabled: true, includePlanned: true, includeMetrics: true, dayPlace: 'avatar', weekPlace: 'profile' }, [], {}, '2026-09-30', plan, [])
    expect(res).toEqual({ done: 1, total: 1, bonusPct: 0 })
  })
})
