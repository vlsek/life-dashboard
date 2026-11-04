import { describe, expect, it } from 'vitest'
import { restoreRow } from './entryRestore'
import type { WorkoutEntry } from './types'

const base = { id: 'e1', user_id: 'u', exercise_id: 'x', date: '2026-10-08', sets: [{ reps: 5, weight: 50 }], notes: 'н' } as unknown as WorkoutEntry

describe('restoreRow: строка для «Отменить»', () => {
  it('без колонок миграции 113 — только базовые поля, с тем же id', () => {
    expect(restoreRow(base)).toEqual({ id: 'e1', user_id: 'u', exercise_id: 'x', date: '2026-10-08', sets: [{ reps: 5, weight: 50 }], notes: 'н' })
  })
  it('с колонками миграции 113 — session_id, position и superset_group возвращаются', () => {
    expect(restoreRow({ ...base, session_id: 's1', position: 2, superset_group: 1 } as never)).toMatchObject({ id: 'e1', session_id: 's1', position: 2, superset_group: 1 })
  })
  it('пустые значения колонок миграции становятся null, а не пропадают', () => {
    const r = restoreRow({ ...base, session_id: null } as never)
    expect(r).toMatchObject({ session_id: null, position: null, superset_group: null })
  })
})
