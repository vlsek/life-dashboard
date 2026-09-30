import { afterEach, describe, expect, it, vi } from 'vitest'
import { addDaysIso, fmtDate, mondayOf, todayStr, weekdayOf } from './date'
import { prepareChartSeries } from './chart'

// Node подхватывает смену TZ на лету; глобал `process` типизирован не везде, поэтому берём env через globalThis.
const env = (globalThis as unknown as { process: { env: Record<string, string | undefined> } }).process.env

// BACKLOG 7.3: даты считаются календарной арифметикой и одинаково в поясах без DST (Москва, UTC+3),
// с DST (Вильнюс, Нью-Йорк) и за линией перехода (Окленд). Node подхватывает смену env.TZ на лету.
const ZONES = ['Europe/Moscow', 'Europe/Vilnius', 'America/New_York', 'Pacific/Auckland']
// Суточные переходы DST: EU 2026-03-29 и 2026-10-25, US 2026-03-08 и 2026-11-01, NZ 2026-09-27 и 2027-04-04.
const DST_DAYS = ['2026-03-08', '2026-03-29', '2026-09-27', '2026-10-25', '2026-11-01', '2027-04-04']
const originalTz = env.TZ

afterEach(() => {
  vi.useRealTimers()
  if (originalTz === undefined) delete env.TZ
  else env.TZ = originalTz
})

describe.each(ZONES)('dates in %s', (tz) => {
  it('addDaysIso steps exactly one calendar day across every DST switch', () => {
    env.TZ = tz
    for (const d of DST_DAYS) {
      const before = addDaysIso(d, -1)
      expect(addDaysIso(before, 1)).toBe(d)
      expect(addDaysIso(d, 1)).toBe(addDaysIso(addDaysIso(d, 1), 0))
      expect(addDaysIso(addDaysIso(d, 1), -1)).toBe(d)
    }
    expect(addDaysIso('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDaysIso('2028-02-28', 1)).toBe('2028-02-29')
  })

  it('mondayOf / weekdayOf do not shift on DST days', () => {
    env.TZ = tz
    expect(weekdayOf('2026-10-25')).toBe(0) // воскресенье, день перехода в ЕС
    expect(mondayOf('2026-10-25')).toBe('2026-10-19')
    expect(mondayOf('2026-03-29')).toBe('2026-03-23')
    expect(mondayOf('2026-11-01')).toBe('2026-10-26')
    expect(mondayOf('2026-03-08')).toBe('2026-03-02')
  })

  it('todayStr is the LOCAL date, not the UTC date, at 00:30 and 23:30 local time', () => {
    env.TZ = tz
    // Локальное 00:30 и 23:30 одного и того же календарного дня 2026-06-15 (без DST-переходов рядом).
    for (const [h, m] of [[0, 30], [23, 30]]) {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2026, 5, 15, h, m))
      expect(todayStr()).toBe('2026-06-15')
      expect(fmtDate(new Date())).toBe('2026-06-15')
      vi.useRealTimers()
    }
  })

  it('prepareChartSeries keeps a continuous day-by-day series over a DST switch (no lost or doubled day)', () => {
    env.TZ = tz
    const dates = ['2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27']
    const out = prepareChartSeries(dates.map((date, i) => ({ date, y: i })), 24)
    expect(out.map((p) => p.date)).toEqual(dates)
  })
})

describe('the UTC trap this audit found', () => {
  it('toISOString().slice(0, 10) is the previous day for UTC+3 at 01:00 local (why streak_import_date uses todayStr)', () => {
    env.TZ = 'Europe/Moscow'
    const local0100 = new Date(2026, 5, 15, 1, 0)
    expect(local0100.toISOString().slice(0, 10)).toBe('2026-06-14')
    expect(fmtDate(local0100)).toBe('2026-06-15')
  })
})
