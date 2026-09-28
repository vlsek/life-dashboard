import { describe, it, expect } from 'vitest'
import { classifyMilestoneReminders, shouldShowWeekendReminder } from './reminders'

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
