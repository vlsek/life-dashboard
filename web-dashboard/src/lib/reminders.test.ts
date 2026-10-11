import { describe, it, expect } from 'vitest'
import { classifyMilestoneReminders, isFirstWeekAccount, shouldShowWeekendReminder, soonDateFor } from './reminders'

describe('classifyMilestoneReminders', () => {
  it('splits rows into overdue (before today) and soon (today or later)', () => {
    const rows = [{ due_date: '2026-09-20' }, { due_date: '2026-09-28' }, { due_date: '2026-10-01' }]
    expect(classifyMilestoneReminders(rows, '2026-09-28')).toEqual({ overdue: 1, soon: 2 })
  })
  it('empty input -> zero counts', () => {
    expect(classifyMilestoneReminders([], '2026-09-28')).toEqual({ overdue: 0, soon: 0 })
  })
})

describe('shouldShowWeekendReminder', () => {
  it('true on Saturday/Sunday when week is under 100%', () => {
    expect(shouldShowWeekendReminder(6, 80)).toBe(true)
    expect(shouldShowWeekendReminder(0, 99)).toBe(true)
  })
  it('false on a weekday, even under 100%', () => {
    expect(shouldShowWeekendReminder(3, 50)).toBe(false)
  })
  it('false once the week already reached (or exceeded) 100%', () => {
    expect(shouldShowWeekendReminder(6, 100)).toBe(false)
    expect(shouldShowWeekendReminder(0, 120)).toBe(false)
  })
})

describe('soonDateFor', () => {
  it('adds 7 calendar days, not 7*86400000ms (safe across a DST transition)', () => {
    // 2026-10-25 — переход на зимнее время в ЕС: этот день длится 25 часов, поэтому
    // Date.now()+7*86400000 (мс-арифметика) даёт на час меньше суток и рискует не
    // перевалить за полночь — соответствующий регрессии баг, который мы чиним.
    expect(soonDateFor('2026-10-25')).toBe('2026-11-01')
  })
  it('is a plain calendar +7 on an ordinary week', () => {
    expect(soonDateFor('2026-01-01')).toBe('2026-01-08')
  })
})

// BACKLOG 57.5: новому пользователю (первая неделя аккаунта) итоги недели не показываем.
describe('первая неделя аккаунта', () => {
  const now = new Date('2026-10-11T12:00:00Z')
  it('isFirstWeekAccount: младше 7 суток — да, ровно 7 и старше — нет, нет даты/мусор — нет', () => {
    expect(isFirstWeekAccount('2026-10-10T12:00:00Z', now)).toBe(true)
    expect(isFirstWeekAccount('2026-10-04T12:00:01Z', now)).toBe(true)
    expect(isFirstWeekAccount('2026-10-04T12:00:00Z', now)).toBe(false)
    expect(isFirstWeekAccount('2026-09-01T00:00:00Z', now)).toBe(false)
    expect(isFirstWeekAccount(null, now)).toBe(false)
    expect(isFirstWeekAccount(undefined, now)).toBe(false)
    expect(isFirstWeekAccount('не дата', now)).toBe(false)
  })
  it('баннер выходного дня у нового аккаунта скрыт, у старого — как раньше', () => {
    expect(shouldShowWeekendReminder(6, 40, '2026-10-08T00:00:00Z', now)).toBe(false)
    expect(shouldShowWeekendReminder(6, 40, '2026-09-01T00:00:00Z', now)).toBe(true)
    expect(shouldShowWeekendReminder(6, 40, null, now)).toBe(true)
  })
})
