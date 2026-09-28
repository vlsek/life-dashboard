import { describe, it, expect } from 'vitest'
import {
  parseOptionsRaw, optionsToRaw, buildSchedule, scheduleSummary, fieldsEnabledForType, clearedForBoolean,
  emptyForm, formFromMetric, scheduleFields, streakImportFields, buildInsertRow, buildUpdateRow,
  nextPosition, categoryKeyFor, goalSummary,
} from './metricsManager'
import type { Metric } from './types'

function metric(o: Partial<Metric> = {}): Metric {
  return {
    id: 'm1', user_id: 'u1', name: 'Test', icon: null, type: 'number', unit: null, goal_value: null,
    goal_direction: null, schedule: null, category_id: null, position: 0, ...o,
  }
}

describe('parseOptionsRaw / optionsToRaw', () => {
  it('parses key:label pairs, falling back to key as label', () => {
    expect(parseOptionsRaw('a:Alpha, b , c:With:colon')).toEqual([
      { key: 'a', label: 'Alpha' }, { key: 'b', label: 'b' }, { key: 'c', label: 'With:colon' },
    ])
  })
  it('returns [] for empty/blank input', () => {
    expect(parseOptionsRaw('')).toEqual([])
    expect(parseOptionsRaw('  ')).toEqual([])
    expect(parseOptionsRaw(null)).toEqual([])
  })
  it('round-trips through optionsToRaw', () => {
    const raw = 'a:Alpha, b:Beta'
    expect(optionsToRaw(parseOptionsRaw(raw))).toBe(raw)
    expect(optionsToRaw(null)).toBe('')
  })
})

describe('buildSchedule', () => {
  const base = { scheduleKind: 'daily' as const, days: [1, 2, 3], weeklyMin: 3, atMostMax: 2 }
  it('daily → null', () => expect(buildSchedule(base)).toBeNull())
  it('days → sorted days; 0 or 7 selected days → null (every day)', () => {
    expect(buildSchedule({ ...base, scheduleKind: 'days', days: [5, 0, 1] })).toEqual({ type: 'days', days: [0, 1, 5] })
    expect(buildSchedule({ ...base, scheduleKind: 'days', days: [] })).toBeNull()
    expect(buildSchedule({ ...base, scheduleKind: 'days', days: [0, 1, 2, 3, 4, 5, 6] })).toBeNull()
  })
  it('weekly clamps to 1..7, at_most clamps to 0..7', () => {
    expect(buildSchedule({ ...base, scheduleKind: 'weekly', weeklyMin: 99 })).toEqual({ type: 'weekly', min: 7 })
    expect(buildSchedule({ ...base, scheduleKind: 'weekly', weeklyMin: 0 })).toEqual({ type: 'weekly', min: 1 })
    expect(buildSchedule({ ...base, scheduleKind: 'at_most', atMostMax: -3 })).toEqual({ type: 'at_most', max: 0 })
    expect(buildSchedule({ ...base, scheduleKind: 'at_most', atMostMax: 9 })).toEqual({ type: 'at_most', max: 7 })
  })
})

describe('scheduleSummary', () => {
  const names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  it('lists days in Mon-first order (Sunday last)', () => {
    expect(scheduleSummary({ type: 'days', days: [0, 1, 3] }, names, '/w', 'max')).toBe('Mon Wed Sun')
  })
  it('formats weekly and at_most, null for no schedule', () => {
    expect(scheduleSummary({ type: 'weekly', min: 3 }, names, '/w', 'max')).toBe('3/w')
    expect(scheduleSummary({ type: 'at_most', max: 2 }, names, '/w', 'max')).toBe('max 2/w')
    expect(scheduleSummary(null, names, '/w', 'max')).toBeNull()
  })
})

describe('fieldsEnabledForType / clearedForBoolean', () => {
  it('enables the right fields per type', () => {
    expect(fieldsEnabledForType('number')).toEqual({ goal: true, inputMode: true, options: false })
    expect(fieldsEnabledForType('boolean')).toEqual({ goal: false, inputMode: false, options: false })
    expect(fieldsEnabledForType('multiselect')).toEqual({ goal: false, inputMode: false, options: true })
    expect(fieldsEnabledForType('sets')).toEqual({ goal: true, inputMode: false, options: true })
  })
  it('clears goal/unit/options when switching to boolean', () => {
    const f = { ...emptyForm(), goalValue: 5, unit: 'km', optionsRaw: 'a:b' }
    expect(clearedForBoolean(f)).toMatchObject({ goalValue: 0, unit: '', optionsRaw: '' })
  })
})

describe('formFromMetric', () => {
  it('maps a metric with a weekly schedule and imported streak', () => {
    const f = formFromMetric(metric({ name: 'Run', type: 'number', goal_value: 5, unit: 'km', goal_direction: 'at_most',
      schedule: { type: 'weekly', min: 4 }, streak_import_days: 10, category_id: 'c1', input_mode: 'add' }))
    expect(f).toMatchObject({ name: 'Run', goalValue: 5, unit: 'km', goalDirection: 'at_most', scheduleKind: 'weekly',
      weeklyMin: 4, streakImportDays: '10', categoryId: 'c1', inputMode: 'add', icon: 'svg:pin' })
  })
  it('defaults for a bare metric', () => {
    expect(formFromMetric(metric())).toMatchObject({ scheduleKind: 'daily', days: [1, 2, 3, 4, 5], streakImportDays: '', inputMode: 'set' })
  })
})

describe('scheduleFields', () => {
  const f = { ...emptyForm(), scheduleKind: 'daily' as const }
  it('omits schedule for a new daily metric, writes null when the column already exists', () => {
    expect(scheduleFields(f, null)).toEqual({})
    expect(scheduleFields(f, metric({ schedule: null }))).toEqual({ schedule: null })
  })
  it('writes a real schedule always', () => {
    expect(scheduleFields({ ...f, scheduleKind: 'weekly', weeklyMin: 2 }, null)).toEqual({ schedule: { type: 'weekly', min: 2 } })
  })
})

describe('streakImportFields', () => {
  const today = '2026-09-28'
  const f = (v: string) => ({ ...emptyForm(), streakImportDays: v })
  it('resets import when cleared and the column exists; nothing when the migration is missing', () => {
    expect(streakImportFields(f(''), metric({ streak_import_days: 5 }), today)).toEqual({ streak_import_days: null, streak_import_date: null })
    expect(streakImportFields(f('0'), metric(), today)).toEqual({})
  })
  it('does nothing when migration 026 is not applied (column absent)', () => {
    expect(streakImportFields(f('7'), metric(), today)).toEqual({})
  })
  it('sets today as the import date only when the number changed', () => {
    const ex = metric({ streak_import_days: 7, streak_import_date: '2026-09-01' })
    expect(streakImportFields(f('7'), ex, today)).toEqual({ streak_import_days: 7, streak_import_date: '2026-09-01' })
    expect(streakImportFields(f('9'), ex, today)).toEqual({ streak_import_days: 9, streak_import_date: today })
  })
})

describe('buildInsertRow / buildUpdateRow', () => {
  it('builds an insert row with trimmed name, parsed options, position and active', () => {
    const form = { ...emptyForm(), name: '  Water ', type: 'multiselect' as const, optionsRaw: 'a:A, b:B', unit: 'ml' }
    const row = buildInsertRow(form, 'u1', 3, 'cat1')
    expect(row).toMatchObject({ user_id: 'u1', name: 'Water', type: 'multiselect', position: 3, active: true,
      category_id: 'cat1', options: [{ key: 'a', label: 'A' }, { key: 'b', label: 'B' }] })
    expect('schedule' in row).toBe(false)
  })
  it('builds an update row without user_id/position/active', () => {
    const row = buildUpdateRow({ ...emptyForm(), name: 'X' }, metric({ schedule: null }), null)
    expect(row).toMatchObject({ name: 'X', category_id: null, schedule: null })
    expect('user_id' in row).toBe(false)
    expect('position' in row).toBe(false)
  })
})

describe('nextPosition / categoryKeyFor / goalSummary', () => {
  it('nextPosition is max+1, 0 when empty', () => {
    expect(nextPosition([])).toBe(0)
    expect(nextPosition([{ position: 2 }, { position: 5 }])).toBe(6)
  })
  it('categoryKeyFor slugifies, caps at 30 chars and appends a base36 timestamp', () => {
    // как в оригинале: хвостовой символ даёт '_', плюс разделитель перед timestamp → двойное подчёркивание
    expect(categoryKeyFor('Мой Спорт!', 36)).toBe('мой_спорт__10')
    expect(categoryKeyFor('x'.repeat(50), 0)).toBe('x'.repeat(30) + '_0')
  })
  it('goalSummary formats number goals by direction, and the other types', () => {
    expect(goalSummary(metric({ goal_direction: 'at_most', goal_value: 3, unit: 'h' }), 'yes/no', 'multi')).toBe('< 3 h')
    expect(goalSummary(metric({ goal_value: 5, unit: 'km' }), 'yes/no', 'multi')).toBe('≥ 5 km')
    expect(goalSummary(metric({ type: 'boolean' }), 'yes/no', 'multi')).toBe('yes/no')
    expect(goalSummary(metric({ type: 'sets' }), 'yes/no', 'multi')).toBe('multi')
  })
})
