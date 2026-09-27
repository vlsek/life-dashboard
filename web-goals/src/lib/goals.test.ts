import { describe, it, expect } from 'vitest'
import {
  bar,
  deadlineLevel,
  goalExtraFields,
  buildInsertRow,
  buildUpdateRow,
  groupActiveByCategory,
  sortDone,
  pointsSummary,
  stepStage,
} from './goals'
import type { Goal } from './types'

describe('bar', () => {
  it('renders filled/empty blocks proportionally, width 8 by default', () => {
    expect(bar(0, 4)).toBe('░░░░░░░░')
    expect(bar(2, 4)).toBe('████░░░░')
    expect(bar(4, 4)).toBe('████████')
  })

  it('handles total=0 without dividing by zero', () => {
    expect(bar(0, 0)).toBe('░░░░░░░░')
  })
})

describe('daysUntil / deadlineLevel', () => {
  const today = new Date('2026-06-15T12:00:00')

  it('classifies overdue/today/soon(<=3d)/later, thresholds match renderGoalRow()', () => {
    expect(deadlineLevel('2026-06-10', today)).toEqual({ level: 'overdue', days: -5 })
    expect(deadlineLevel('2026-06-15', today)).toEqual({ level: 'today', days: 0 })
    expect(deadlineLevel('2026-06-18', today)).toEqual({ level: 'soon', days: 3 })
    expect(deadlineLevel('2026-06-19', today)).toEqual({ level: 'later', days: 4 })
    expect(deadlineLevel(null, today)).toEqual({ level: null, days: null })
  })
})

function goal(overrides: Partial<Goal>): Goal {
  return {
    id: crypto.randomUUID(),
    user_id: 'u1',
    name: 'G',
    points: 5,
    category: 'Быт',
    stages: 1,
    current_stage: 0,
    done: false,
    done_date: null,
    deadline: null,
    difficulty: null,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('goalExtraFields', () => {
  it('omits deadline/difficulty when unset and the goal never had those columns', () => {
    expect(goalExtraFields({ deadline: '', difficulty: null }, null)).toEqual({})
  })

  it('includes them once set', () => {
    expect(goalExtraFields({ deadline: '2026-08-01', difficulty: 'hard' }, null)).toEqual({
      deadline: '2026-08-01',
      difficulty: 'hard',
    })
  })

  it('keeps writing null (not omitting) once the existing goal already has the columns', () => {
    const existing = goal({ deadline: '2026-05-01' })
    expect(goalExtraFields({ deadline: '', difficulty: null }, existing)).toEqual({ deadline: null, difficulty: null })
  })
})

describe('buildInsertRow', () => {
  it('defaults points to 5, stages to at least 1, category to the no-category label', () => {
    const row = buildInsertRow({ name: '  Прочитать книгу  ', points: 0, category: '', stages: 0, difficulty: null, deadline: '' }, 'Без категории')
    expect(row).toEqual({
      name: 'Прочитать книгу',
      points: 5,
      category: 'Без категории',
      stages: 1,
      current_stage: 0,
      done: false,
    })
  })
})

describe('buildUpdateRow', () => {
  it('clamps current_stage down when stages shrinks below it', () => {
    const existing = goal({ stages: 5, current_stage: 4 })
    const row = buildUpdateRow({ name: 'G', points: 5, category: 'Быт', stages: 2, difficulty: null, deadline: '' }, existing, 'Без категории')
    expect(row.current_stage).toBe(2)
    expect(row.done).toBe(true) // current_stage clamped to stages -> считается выполненной
  })

  it('recomputes done for multi-stage goals based on current progress vs new stages', () => {
    const existing = goal({ stages: 3, current_stage: 2 })
    const row = buildUpdateRow({ name: 'G', points: 5, category: 'Быт', stages: 5, difficulty: null, deadline: '' }, existing, 'Без категории')
    expect(row.current_stage).toBeUndefined() // не подрезаем, если прогресс всё ещё меньше нового stages
    expect(row.done).toBe(false)
  })

  it('does not touch done for single-stage goals (toggleGoal handles that instead)', () => {
    const existing = goal({ stages: 1, current_stage: 0 })
    const row = buildUpdateRow({ name: 'G', points: 5, category: 'Быт', stages: 1, difficulty: null, deadline: '' }, existing, 'Без категории')
    expect(row.done).toBeUndefined()
  })
})

describe('groupActiveByCategory', () => {
  it('groups by category (sorted), sorts within group by deadline asc, no-deadline last', () => {
    const items = [
      goal({ name: 'A', category: 'Работа', deadline: '2026-08-01' }),
      goal({ name: 'B', category: 'Работа', deadline: null }),
      goal({ name: 'C', category: 'Работа', deadline: '2026-06-01' }),
      goal({ name: 'D', category: 'Дом', deadline: '2026-05-01' }),
    ]
    const groups = groupActiveByCategory(items, 'Без категории')
    expect(groups.map(([cat]) => cat)).toEqual(['Дом', 'Работа'])
    const [, workItems] = groups[1]
    expect(workItems.map((g) => g.name)).toEqual(['C', 'A', 'B'])
  })
})

describe('sortDone', () => {
  it('sorts by done_date desc', () => {
    const items = [goal({ name: 'old', done_date: '2026-01-01' }), goal({ name: 'new', done_date: '2026-06-01' })]
    expect(sortDone(items).map((g) => g.name)).toEqual(['new', 'old'])
  })
})

describe('pointsSummary', () => {
  it('sums earned (done only) vs possible (all), defaulting missing points to 5', () => {
    const items = [
      goal({ points: 10, done: true }),
      goal({ points: 5, done: false }),
      goal({ points: undefined as unknown as number, done: true }),
    ]
    expect(pointsSummary(items)).toEqual({ earned: 15, possible: 20 })
  })
})

describe('stepStage', () => {
  it('clamps between 0 and stages, marks done at the max', () => {
    expect(stepStage({ stages: 3, current_stage: 2 }, 1)).toEqual({ current_stage: 3, done: true })
    expect(stepStage({ stages: 3, current_stage: 0 }, -1)).toEqual({ current_stage: 0, done: false })
  })
})
