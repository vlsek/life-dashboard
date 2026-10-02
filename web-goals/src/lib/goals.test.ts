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
  stageTapTarget,
  stageResult,
  stagePercent,
  stageProgress,
  MAX_SEGMENTS,
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

// BACKLOG 7.1 «Многоступенчатые цели»: современные карточки с этапами
describe('stageTapTarget', () => {
  it('sets progress up to the tapped stage', () => {
    expect(stageTapTarget(0, 5, 3)).toBe(3)
    expect(stageTapTarget(2, 5, 5)).toBe(5)
    expect(stageTapTarget(4, 5, 2)).toBe(2) // можно вернуться на более ранний этап
  })
  it('tapping the last completed stage undoes it', () => {
    expect(stageTapTarget(3, 5, 3)).toBe(2)
    expect(stageTapTarget(1, 5, 1)).toBe(0)
    expect(stageTapTarget(5, 5, 5)).toBe(4)
  })
  it('clamps garbage input into 1..stages', () => {
    expect(stageTapTarget(0, 5, 99)).toBe(5)
    expect(stageTapTarget(0, 5, 0)).toBe(1)
    expect(stageTapTarget(0, 5, -3)).toBe(1)
    expect(stageTapTarget(9, 5, 5)).toBe(4) // current > stages приводится к stages
    expect(stageTapTarget(0, 0, 1)).toBe(1) // stages < 1 считается за 1
  })
  it('the "next stage" button is a tap on current + 1', () => {
    expect(stageTapTarget(2, 5, 3)).toBe(3)
    expect(stageTapTarget(4, 5, 5)).toBe(5)
  })
})

describe('stageResult', () => {
  it('marks the goal done only when all stages are completed', () => {
    expect(stageResult(5, 4)).toEqual({ current_stage: 4, done: false })
    expect(stageResult(5, 5)).toEqual({ current_stage: 5, done: true })
    expect(stageResult(5, 0)).toEqual({ current_stage: 0, done: false })
  })
  it('clamps the target', () => {
    expect(stageResult(5, 9)).toEqual({ current_stage: 5, done: true })
    expect(stageResult(5, -2)).toEqual({ current_stage: 0, done: false })
  })
  it('agrees with stepStage for a single step', () => {
    const g = { stages: 4, current_stage: 2 }
    expect(stageResult(4, 3)).toEqual(stepStage(g, 1))
    expect(stageResult(4, 1)).toEqual(stepStage(g, -1))
  })
})

describe('stagePercent / stageProgress', () => {
  it('rounds the percentage', () => {
    expect(stagePercent(0, 3)).toBe(0)
    expect(stagePercent(1, 3)).toBe(33)
    expect(stagePercent(2, 3)).toBe(67)
    expect(stagePercent(3, 3)).toBe(100)
    expect(stagePercent(7, 3)).toBe(100)
  })
  it('uses one segment per stage up to the limit and a bar beyond it', () => {
    expect(stageProgress(2, 5)).toEqual({ mode: 'segments', filled: 2, total: 5 })
    expect(stageProgress(0, MAX_SEGMENTS)).toEqual({ mode: 'segments', filled: 0, total: MAX_SEGMENTS })
    expect(stageProgress(13, MAX_SEGMENTS + 2)).toEqual({ mode: 'bar', pct: 93 }) // 13 из 14
    expect(stageProgress(13, MAX_SEGMENTS + 1)).toEqual({ mode: 'bar', pct: 100 }) // 13 из 13: уже полоса, а не 13 сегментов
  })
  it('never fills more than the total', () => {
    expect(stageProgress(9, 4)).toEqual({ mode: 'segments', filled: 4, total: 4 })
  })
})
