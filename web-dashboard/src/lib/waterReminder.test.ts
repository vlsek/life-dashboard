import { beforeEach, describe, expect, it } from 'vitest'
import {
  QUIET_FROM_HOUR,
  WATER_REMINDER_INTERVAL_MS,
  WATER_REMINDER_LAST_KEY,
  WATER_REMINDER_OFF_KEY,
  isQuietHour,
  readLastShown,
  remindersOff,
  shouldRemindWater,
  writeLastShown,
} from './waterReminder'

const at = (h: number, m = 0) => new Date(2026, 9, 1, h, m)
const base = { now: at(14), lastShownMs: null as number | null, ml: 800, goal: 2000, off: false }

describe('shouldRemindWater (BACKLOG 18.5)', () => {
  it('reminds on open when the goal is not reached and nothing was shown yet', () => {
    expect(shouldRemindWater(base)).toBe(true)
  })
  it('does not remind when the goal is reached or exceeded', () => {
    expect(shouldRemindWater({ ...base, ml: 2000 })).toBe(false)
    expect(shouldRemindWater({ ...base, ml: 2600 })).toBe(false)
  })
  it('does not remind without a goal (no water metric / no norm)', () => {
    expect(shouldRemindWater({ ...base, goal: null })).toBe(false)
    expect(shouldRemindWater({ ...base, goal: 0 })).toBe(false)
    expect(shouldRemindWater({ ...base, goal: undefined })).toBe(false)
  })
  it('respects the off switch from the settings', () => {
    expect(shouldRemindWater({ ...base, off: true })).toBe(false)
  })
  it('at most once every 3 hours: blocked just before, allowed exactly at 3 hours', () => {
    const last = base.now.getTime()
    expect(shouldRemindWater({ ...base, now: new Date(last + WATER_REMINDER_INTERVAL_MS - 1), lastShownMs: last })).toBe(false)
    expect(shouldRemindWater({ ...base, now: new Date(last + WATER_REMINDER_INTERVAL_MS), lastShownMs: last })).toBe(true)
  })
  it('a clock set back (last shown "in the future") does not silence the reminder forever', () => {
    expect(shouldRemindWater({ ...base, lastShownMs: base.now.getTime() + 5 * 60 * 60 * 1000 })).toBe(true)
  })
  it('garbage in storage is treated as "never shown"', () => {
    expect(shouldRemindWater({ ...base, lastShownMs: Number.NaN })).toBe(true)
  })
  it('stays silent at night: 22:00–08:00', () => {
    expect(isQuietHour(at(QUIET_FROM_HOUR))).toBe(true)
    expect(isQuietHour(at(23, 59))).toBe(true)
    expect(isQuietHour(at(0, 5))).toBe(true)
    expect(isQuietHour(at(7, 59))).toBe(true)
    expect(isQuietHour(at(8))).toBe(false)
    expect(isQuietHour(at(21, 59))).toBe(false)
    expect(shouldRemindWater({ ...base, now: at(23) })).toBe(false)
    expect(shouldRemindWater({ ...base, now: at(3) })).toBe(false)
    expect(shouldRemindWater({ ...base, now: at(9) })).toBe(true)
  })
})

describe('storage helpers', () => {
  beforeEach(() => localStorage.clear())
  it('last-shown round-trips and is null when absent', () => {
    expect(readLastShown()).toBeNull()
    writeLastShown(123456)
    expect(localStorage.getItem(WATER_REMINDER_LAST_KEY)).toBe('123456')
    expect(readLastShown()).toBe(123456)
  })
  it('the off flag is the same key the header settings write', () => {
    expect(remindersOff()).toBe(false)
    localStorage.setItem(WATER_REMINDER_OFF_KEY, '1')
    expect(WATER_REMINDER_OFF_KEY).toBe('water_reminders_off')
    expect(remindersOff()).toBe(true)
  })
})
