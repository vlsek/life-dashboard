import { beforeEach, describe, expect, it, vi } from 'vitest'

// BACKLOG 81.4: выполнили повторяющуюся цель — создаётся следующая (один раз); сняли выполнение — нетронутая следующая убирается.
const db = vi.hoisted(() => ({ inserted: [] as Record<string, unknown>[], updates: [] as { id: string; patch: Record<string, unknown> }[], deleted: [] as string[], next: { id: 'n1', done: false, current_stage: 0 } as { id: string; done: boolean; current_stage: number } | null }))
vi.mock('./lib/supabase', () => ({
  sb: {
    from: () => ({
      insert: (row: Record<string, unknown>) => {
        db.inserted.push(row)
        return { select: () => ({ single: async () => ({ data: { id: 'n1' }, error: null }) }) }
      },
      update: (patch: Record<string, unknown>) => ({
        eq: async (_c: string, id: string) => {
          db.updates.push({ id, patch })
          return { error: null }
        },
      }),
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: db.next, error: null }) }) }),
      delete: () => ({
        eq: async (_c: string, id: string) => {
          db.deleted.push(id)
          return { error: null }
        },
      }),
    }),
    auth: { getSession: async () => ({ data: { session: null } }) },
  },
}))

import { useGoals } from './lib/useGoals'
import type { Goal } from './lib/types'

const goal = (over: Partial<Goal> = {}): Goal =>
  ({ id: 'g1', user_id: 'u', name: 'Счета', points: 5, category: 'Дом', stages: 1, current_stage: 0, done: false, done_date: null, deadline: '2026-11-05', difficulty: null, repeat_every: 'month', repeat_next_id: null, created_at: '2026-01-01', ...over }) as Goal

beforeEach(() => {
  db.inserted = []
  db.updates = []
  db.deleted = []
  db.next = { id: 'n1', done: false, current_stage: 0 }
})

describe('повторяющаяся цель', () => {
  it('выполнение создаёт следующую и запоминает её id', async () => {
    const { toggleGoal } = useGoals()
    await toggleGoal(goal())
    expect(db.inserted).toHaveLength(1)
    expect(db.inserted[0]).toMatchObject({ name: 'Счета', done: false, current_stage: 0, repeat_every: 'month' })
    expect(db.updates.some((u) => u.id === 'g1' && u.patch.repeat_next_id === 'n1')).toBe(true)
  })
  it('уже есть следующая (repeat_next_id) — не плодим дубликат', async () => {
    const { toggleGoal } = useGoals()
    await toggleGoal(goal({ repeat_next_id: 'n1' }))
    expect(db.inserted).toHaveLength(0)
  })
  it('обычная цель без повтора ничего не создаёт', async () => {
    const { toggleGoal } = useGoals()
    await toggleGoal(goal({ repeat_every: null }))
    expect(db.inserted).toHaveLength(0)
  })
  it('снятие выполнения убирает нетронутую следующую и очищает ссылку', async () => {
    const { toggleGoal } = useGoals()
    await toggleGoal(goal({ done: true, done_date: '2026-11-05', repeat_next_id: 'n1' }))
    expect(db.deleted).toEqual(['n1'])
    expect(db.updates.some((u) => u.id === 'g1' && u.patch.repeat_next_id === null)).toBe(true)
  })
  it('следующая уже тронута (выполнена/есть прогресс) — не удаляем', async () => {
    db.next = { id: 'n1', done: false, current_stage: 2 }
    const { toggleGoal } = useGoals()
    await toggleGoal(goal({ done: true, done_date: '2026-11-05', repeat_next_id: 'n1' }))
    expect(db.deleted).toEqual([])
  })
})
