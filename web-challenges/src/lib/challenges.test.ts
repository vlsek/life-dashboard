import { describe, expect, it } from 'vitest'
import {
  daysBetween,
  targetForDay,
  dayDateStr,
  computeDailyStats,
  computeCumulativeStats,
  buildInsertFromTemplate,
  buildInsertCustom,
  fieldsEnabledForType,
} from './challenges'
import type { ChallengeEntry, ChallengeTemplate, CustomChallengeFormInput } from './types'

describe('daysBetween', () => {
  it('counts whole days between two date strings', () => {
    expect(daysBetween('2026-01-01', '2026-01-01')).toBe(0)
    expect(daysBetween('2026-01-01', '2026-01-05')).toBe(4)
    expect(daysBetween('2026-01-05', '2026-01-01')).toBe(-4)
  })
})

describe('targetForDay', () => {
  it('daily_fixed returns the same target every day', () => {
    const ch = { type: 'daily_fixed' as const, daily_target: 100, start_value: null, daily_increment: null }
    expect(targetForDay(ch, 0)).toBe(100)
    expect(targetForDay(ch, 29)).toBe(100)
  })

  it('daily_progressive grows by increment each day from start_value', () => {
    const ch = { type: 'daily_progressive' as const, daily_target: null, start_value: 10, daily_increment: 5 }
    expect(targetForDay(ch, 0)).toBe(10)
    expect(targetForDay(ch, 1)).toBe(15)
    expect(targetForDay(ch, 29)).toBe(10 + 5 * 29)
  })

  it('daily_boolean and cumulative_count have no numeric daily target', () => {
    expect(targetForDay({ type: 'daily_boolean', daily_target: null, start_value: null, daily_increment: null }, 3)).toBeNull()
    expect(targetForDay({ type: 'cumulative_count', daily_target: null, start_value: null, daily_increment: null }, 3)).toBeNull()
  })
})

describe('dayDateStr', () => {
  it('advances from start_date by i days', () => {
    expect(dayDateStr('2026-01-01', 0)).toBe('2026-01-01')
    expect(dayDateStr('2026-01-01', 5)).toBe('2026-01-06')
    expect(dayDateStr('2026-01-30', 3)).toBe('2026-02-02')
  })
})

function entry(overrides: Partial<ChallengeEntry>): ChallengeEntry {
  return {
    id: crypto.randomUUID(),
    user_id: 'u1',
    challenge_id: 'c1',
    date: '2026-01-01',
    value: 1,
    note: null,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('computeDailyStats — daily_fixed', () => {
  const ch = {
    type: 'daily_fixed' as const,
    start_date: '2026-01-01',
    duration_days: 5,
    daily_target: 100,
    start_value: null,
    daily_increment: null,
  }

  it('marks a day done only when its entry meets the fixed target', () => {
    const entries = [entry({ date: '2026-01-01', value: 100 }), entry({ date: '2026-01-02', value: 50 })]
    const stats = computeDailyStats(ch, entries, '2026-01-03')
    expect(stats.todayIdx).toBe(2)
    expect(stats.duration).toBe(5)
    expect(stats.isBoolean).toBe(false)
    expect(stats.doneDays[0].done).toBe(true) // day 0: 100 >= 100
    expect(stats.doneDays[1].done).toBe(false) // day 1: 50 < 100
    expect(stats.doneDays[2].isToday).toBe(true)
    expect(stats.doneDays[3].isFuture).toBe(true)
    expect(stats.completedCount).toBe(1)
    expect(stats.isOver).toBe(false)
    expect(stats.todayTarget).toBe(100)
  })

  it('is over once today is at or past duration_days', () => {
    const stats = computeDailyStats(ch, [], '2026-01-08')
    expect(stats.isOver).toBe(true)
  })
})

describe('computeDailyStats — daily_progressive', () => {
  const ch = {
    type: 'daily_progressive' as const,
    start_date: '2026-01-01',
    duration_days: 3,
    daily_target: null,
    start_value: 10,
    daily_increment: 5,
  }

  it("checks each day's entry against that day's own growing target", () => {
    const entries = [entry({ date: '2026-01-01', value: 10 }), entry({ date: '2026-01-02', value: 12 })]
    const stats = computeDailyStats(ch, entries, '2026-01-02')
    expect(stats.doneDays[0].done).toBe(true) // target 10, value 10
    expect(stats.doneDays[1].done).toBe(false) // target 15, value 12
    expect(stats.todayTarget).toBe(15)
  })
})

describe('computeDailyStats — daily_boolean', () => {
  const ch = { type: 'daily_boolean' as const, start_date: '2026-01-01', duration_days: 21, daily_target: null, start_value: null, daily_increment: null }

  it('treats value===1 as done, anything else as not done, ignores numeric target', () => {
    const entries = [entry({ date: '2026-01-01', value: 1 }), entry({ date: '2026-01-02', value: 0 })]
    const stats = computeDailyStats(ch, entries, '2026-01-02')
    expect(stats.isBoolean).toBe(true)
    expect(stats.doneDays[0].done).toBe(true)
    expect(stats.doneDays[1].done).toBe(false)
    expect(stats.todayTarget).toBeNull()
  })
})

describe('computeCumulativeStats', () => {
  it('sums entry values against target_count and computes a clamped percentage', () => {
    const ch = { target_count: 100, item_label: 'книга' }
    const entries = [entry({ value: 1 }), entry({ value: 1 }), entry({ value: 1 })]
    const stats = computeCumulativeStats(ch, entries)
    expect(stats.count).toBe(3)
    expect(stats.target).toBe(100)
    expect(stats.itemWord).toBe('книга')
    expect(stats.pct).toBe(3)
    expect(stats.canComplete).toBe(false)
  })

  it('can complete once count reaches target, percentage never exceeds 100', () => {
    const ch = { target_count: 2, item_label: 'слово' }
    const entries = [entry({ value: 1 }), entry({ value: 1 }), entry({ value: 1 })]
    const stats = computeCumulativeStats(ch, entries)
    expect(stats.count).toBe(3)
    expect(stats.pct).toBe(100)
    expect(stats.canComplete).toBe(true)
  })

  it('does not divide by zero when there is no target yet', () => {
    const stats = computeCumulativeStats({ target_count: null, item_label: null }, [])
    expect(stats.pct).toBe(0)
    expect(stats.canComplete).toBe(false)
  })
})

describe('buildInsertFromTemplate', () => {
  it('carries every template field into the insert row, defaulting missing ones to null', () => {
    const tpl: ChallengeTemplate = {
      id: 'pushups_100_30',
      icon: '💪',
      title: '100 push-ups every day — a month',
      description: '…',
      type: 'daily_fixed',
      durationDays: 30,
      dailyTarget: 100,
      unit: 'reps',
    }
    expect(buildInsertFromTemplate(tpl)).toEqual({
      template_id: 'pushups_100_30',
      title: tpl.title,
      icon: '💪',
      type: 'daily_fixed',
      unit: 'reps',
      duration_days: 30,
      daily_target: 100,
      start_value: null,
      daily_increment: null,
      target_count: null,
      item_label: null,
    })
  })
})

function customForm(overrides: Partial<CustomChallengeFormInput>): CustomChallengeFormInput {
  return {
    title: 'My challenge',
    icon: '🏆',
    type: 'daily_fixed',
    duration: 30,
    dailyTarget: 0,
    startValue: 0,
    increment: 1,
    unit: '',
    targetCount: 10,
    itemLabel: '',
    ...overrides,
  }
}

describe('buildInsertCustom', () => {
  it('daily_fixed: keeps duration/daily_target/unit, nulls the rest', () => {
    const row = buildInsertCustom(customForm({ type: 'daily_fixed', duration: 14, dailyTarget: 50, unit: 'ml' }))
    expect(row).toEqual({
      template_id: null,
      title: 'My challenge',
      icon: '🏆',
      type: 'daily_fixed',
      unit: 'ml',
      duration_days: 14,
      daily_target: 50,
      start_value: null,
      daily_increment: null,
      target_count: null,
      item_label: null,
    })
  })

  it('daily_progressive: keeps duration/start_value/daily_increment/unit', () => {
    const row = buildInsertCustom(customForm({ type: 'daily_progressive', duration: 30, startValue: 10, increment: 5, unit: 'reps' }))
    expect(row.duration_days).toBe(30)
    expect(row.start_value).toBe(10)
    expect(row.daily_increment).toBe(5)
    expect(row.daily_target).toBeNull()
    expect(row.target_count).toBeNull()
  })

  it('daily_boolean: unit forced to null even if the field was filled', () => {
    const row = buildInsertCustom(customForm({ type: 'daily_boolean', unit: 'should be dropped' }))
    expect(row.unit).toBeNull()
    expect(row.duration_days).toBe(30)
    expect(row.daily_target).toBeNull()
  })

  it('cumulative_count: keeps target_count/item_label, nulls daily_* fields including duration', () => {
    const row = buildInsertCustom(customForm({ type: 'cumulative_count', targetCount: 100, itemLabel: 'книга' }))
    expect(row.duration_days).toBeNull()
    expect(row.target_count).toBe(100)
    expect(row.item_label).toBe('книга')
  })

  it('falls back to a default title icon and duration when left blank', () => {
    const row = buildInsertCustom(customForm({ title: '  Trimmed  ', icon: '', duration: 0, type: 'daily_fixed' }))
    expect(row.title).toBe('Trimmed')
    expect(row.icon).toBe('🏆')
    expect(row.duration_days).toBe(30)
  })
})

describe('fieldsEnabledForType', () => {
  it('enables exactly the fields relevant to each type', () => {
    expect(fieldsEnabledForType('daily_fixed')).toEqual({
      duration: true,
      dailyTarget: true,
      startValue: false,
      increment: false,
      unit: true,
      targetCount: false,
      itemLabel: false,
    })
    expect(fieldsEnabledForType('daily_progressive')).toEqual({
      duration: true,
      dailyTarget: false,
      startValue: true,
      increment: true,
      unit: true,
      targetCount: false,
      itemLabel: false,
    })
    expect(fieldsEnabledForType('daily_boolean')).toEqual({
      duration: true,
      dailyTarget: false,
      startValue: false,
      increment: false,
      unit: false,
      targetCount: false,
      itemLabel: false,
    })
    expect(fieldsEnabledForType('cumulative_count')).toEqual({
      duration: false,
      dailyTarget: false,
      startValue: false,
      increment: false,
      unit: true,
      targetCount: true,
      itemLabel: true,
    })
  })
})
