import { beforeEach, describe, expect, it, vi } from 'vitest'

type Row = Record<string, unknown>
const h = vi.hoisted(() => ({
  tables: {} as Record<string, Row[]>,
  failDailyValues: false,
  noExerciseColumn: false,
  calls: [] as { table: string; method: string; args: unknown[] }[],
  selected: [] as string[],
}))

vi.mock('./supabase', () => {
  function builder(table: string) {
    const b: Record<string, unknown> = {}
    const result = () => {
      if (table === 'daily_values' && h.failDailyValues) return { data: null, error: { message: 'boom' } }
      if (table === 'challenge_instances' && h.noExerciseColumn && h.selected.at(-1) === 'source_exercise_id') return { data: null, error: { message: 'column does not exist' } }
      return { data: h.tables[table] ?? [], error: null }
    }
    for (const m of ['select', 'eq', 'in', 'gte', 'order', 'range', 'limit']) {
      b[m] = (...args: unknown[]) => {
        h.calls.push({ table, method: m, args })
        if (m === 'select') h.selected.push(String(args[0]))
        return b
      }
    }
    b.maybeSingle = async () => ({ data: (h.tables[table] ?? [])[0] ?? null, error: null })
    b.then = (resolve: (v: unknown) => unknown) => resolve(result())
    return b
  }
  return {
    sb: {
      auth: { getSession: async () => ({ data: { session: { user: { id: 'u1', email: 'a@b' } } } }) },
      from: (table: string) => builder(table),
    },
  }
})

import { flushPromises } from '@vue/test-utils'
import { useChallenges } from './useChallenges'

const instance = (over: Row = {}): Row => ({
  id: 'c1', user_id: 'u1', template_id: null, title: 'Отжимания', icon: '💪', type: 'daily_fixed', unit: 'раз', start_date: '2026-09-01',
  duration_days: 30, daily_target: 100, start_value: null, daily_increment: null, target_count: null, item_label: null,
  active: true, completed: false, completed_at: null, created_at: '2026-09-01T00:00:00Z', ...over,
})

async function setup() {
  const c = useChallenges()
  await c.init()
  await flushPromises()
  return c
}

describe('useChallenges — значения из упражнения Workouts', () => {
  beforeEach(() => {
    h.calls.length = 0
    h.selected.length = 0
    h.noExerciseColumn = false
    h.failDailyValues = false
    h.tables = {
      profiles: [{ onboarded: true }],
      challenge_entries: [{ id: 'e1', user_id: 'u1', challenge_id: 'c1', date: '2026-09-02', value: 5, note: null, created_at: '' }],
      metrics: [],
      workout_exercises: [
        { id: 'x1', name: 'Подтягивания', category: 'Спина', unit: 'кг' },
        { id: 'x2', name: 'Приседания', category: null, unit: 'кг' },
      ],
      workout_entries: [
        { exercise_id: 'x1', date: '2026-09-01', sets: [{ reps: 8 }, { reps: 7 }] },
        { exercise_id: 'x1', date: '2026-09-01', sets: [{ reps: 5 }] },
        { exercise_id: 'x1', date: '2026-09-02', sets: [{ reps: 30 }] },
        { exercise_id: 'x2', date: '2026-09-01', sets: [{ reps: 100 }] },
      ],
    }
  })

  it('merges workout reps into the entries: sums per day, manual entry wins, name is resolved', async () => {
    h.tables.challenge_instances = [instance({ source_exercise_id: 'x1' })]
    const c = await setup()
    const ch = c.instances.value[0]
    const byDate = Object.fromEntries(c.effectiveEntries(ch).map((e) => [e.date, e.value]))
    expect(byDate).toEqual({ '2026-09-02': 5, '2026-09-01': 20 })
    expect(c.sourceExerciseName(ch)).toBe('Подтягивания')
  })

  it('offers the exercises for the form, and does not query workout_entries when no challenge uses one', async () => {
    h.tables.challenge_instances = [instance()]
    const c = await setup()
    expect(c.exercises.value.map((e) => e.id)).toEqual(['x1', 'x2'])
    expect(h.calls.some((x) => x.table === 'workout_entries')).toBe(false)
  })

  it('before migration 042 (no column) the exercise choice stays hidden and nothing else breaks', async () => {
    h.noExerciseColumn = true
    h.tables.challenge_instances = [instance()]
    const c = await setup()
    expect(c.exercises.value).toEqual([])
    expect(c.error.value).toBeNull()
    expect(c.effectiveEntries(c.instances.value[0]).map((e) => e.date)).toEqual(['2026-09-02'])
  })
})
