import { describe, it, expect } from 'vitest'
import { addInterval, daysUntil, statusLevel, buildRow, groupActiveByCategory, sortDone, summary } from './milestones'
import type { Milestone } from './types'

describe('addInterval', () => {
  it('adds days/weeks plainly', () => {
    expect(addInterval('2026-01-10', 5, 'day')).toBe('2026-01-15')
    expect(addInterval('2026-01-10', 2, 'week')).toBe('2026-01-24')
  })

  it('clamps month-end instead of rolling over (31 Jan + 1 month = 28 Feb on non-leap year)', () => {
    expect(addInterval('2026-01-31', 1, 'month')).toBe('2026-02-28')
  })

  it('handles leap years for the Feb clamp', () => {
    expect(addInterval('2028-01-31', 1, 'month')).toBe('2028-02-29')
  })

  it('adds years as 12 * value months, same clamp rule', () => {
    expect(addInterval('2026-02-28', 1, 'year')).toBe('2027-02-28')
    expect(addInterval('2028-02-29', 1, 'year')).toBe('2029-02-28')
  })
})

describe('daysUntil / statusLevel', () => {
  const today = new Date('2026-06-15T12:00:00')

  it('classifies overdue/today/soon/later at the same thresholds as vanilla statusChip()', () => {
    expect(statusLevel('2026-06-10', today)).toEqual({ level: 'overdue', days: -5 })
    expect(statusLevel('2026-06-15', today)).toEqual({ level: 'today', days: 0 })
    expect(statusLevel('2026-06-29', today)).toEqual({ level: 'soon', days: 14 })
    expect(statusLevel('2026-06-30', today)).toEqual({ level: 'later', days: 15 })
    expect(statusLevel(null, today)).toEqual({ level: null, days: null })
  })

  it('daysUntil matches vanilla rounding', () => {
    expect(daysUntil('2026-06-20', today)).toBe(5)
  })
})

describe('buildRow', () => {
  it('computes due_date from last_date + interval when interval is set', () => {
    const row = buildRow(
      {
        name: '  Замена масла  ',
        category: '',
        last_date: '2026-01-15',
        interval_value: 6,
        interval_unit: 'month',
        due_date: '',
        last_km: 45000,
        interval_km: 10000,
        note: '',
      },
      'Без категории',
    )
    expect(row.name).toBe('Замена масла')
    expect(row.category).toBe('Без категории')
    expect(row.due_date).toBe('2026-07-15')
    expect(row.interval_value).toBe(6)
    expect(row.interval_unit).toBe('month')
  })

  it('falls back to manually entered due_date when no interval is set', () => {
    const row = buildRow(
      {
        name: 'Разовая веха',
        category: 'Личное',
        last_date: '',
        interval_value: 0,
        interval_unit: 'month',
        due_date: '2026-12-01',
        last_km: 0,
        interval_km: 0,
        note: '  заметка  ',
      },
      'Без категории',
    )
    expect(row.due_date).toBe('2026-12-01')
    expect(row.interval_value).toBeNull()
    expect(row.interval_unit).toBeNull()
    expect(row.note).toBe('заметка')
  })
})

function milestone(overrides: Partial<Milestone>): Milestone {
  return {
    id: crypto.randomUUID(),
    user_id: 'u1',
    name: 'M',
    category: 'Быт',
    last_date: null,
    interval_value: null,
    interval_unit: null,
    due_date: null,
    last_km: null,
    interval_km: null,
    note: null,
    history: [],
    done: false,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('groupActiveByCategory', () => {
  it('groups by category (sorted keys), sorts within group by due_date asc, no-due last', () => {
    const items = [
      milestone({ name: 'A', category: 'Дом', due_date: '2026-08-01' }),
      milestone({ name: 'B', category: 'Дом', due_date: null }),
      milestone({ name: 'C', category: 'Дом', due_date: '2026-06-01' }),
      milestone({ name: 'D', category: 'Авто', due_date: '2026-05-01' }),
    ]
    const groups = groupActiveByCategory(items, 'Без категории')
    expect(groups.map(([cat]) => cat)).toEqual(['Авто', 'Дом'])
    const [, domItems] = groups[1]
    expect(domItems.map((m) => m.name)).toEqual(['C', 'A', 'B'])
  })
})

describe('sortDone', () => {
  it('sorts by last_date desc', () => {
    const items = [
      milestone({ name: 'old', last_date: '2026-01-01', done: true }),
      milestone({ name: 'new', last_date: '2026-06-01', done: true }),
    ]
    expect(sortDone(items).map((m) => m.name)).toEqual(['new', 'old'])
  })
})

describe('summary', () => {
  it('counts overdue and soon (<=14 days) among active milestones', () => {
    const today = new Date('2026-06-15T12:00:00')
    const items = [
      milestone({ due_date: '2026-06-10' }), // overdue
      milestone({ due_date: '2026-06-20' }), // soon
      milestone({ due_date: '2026-09-01' }), // later
      milestone({ due_date: null }),
    ]
    expect(summary(items, today)).toEqual({ overdue: 1, soon: 1 })
  })
})
