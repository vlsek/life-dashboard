import { describe, expect, it } from 'vitest'
import { itemRows, mergeRoutines, routineRow, routinesFromRemote } from './routineSync'
import type { Routine } from './routines'

const R = (id: string, name: string, at: string): Routine => ({ id, name, updated_at: at, items: [{ exercise_id: 'e1', target_sets: 3, superset_group: null }, { exercise_id: 'e2', target_sets: 4, superset_group: 1 }] })

describe('routineSync', () => {
  it('строки для записи: позиции и пользователь', () => {
    let n = 0
    const rows = itemRows('u', R('r1', 'A', '2026-01-01'), () => `i${++n}`)
    expect(rows.map((x) => [x.id, x.position, x.exercise_id, x.target_sets, x.superset_group, x.user_id, x.routine_id])).toEqual([['i1', 0, 'e1', 3, null, 'u', 'r1'], ['i2', 1, 'e2', 4, 1, 'u', 'r1']])
    expect(routineRow('u', R('r1', 'A', '2026-01-01'), 2)).toMatchObject({ id: 'r1', position: 2, archived: false })
  })
  it('из сервера: порядок, архивные и пустые пропускаются, шаги ограничены', () => {
    const out = routinesFromRemote(
      [{ id: 'b', name: 'B', position: 1 }, { id: 'a', name: 'A', position: 0 }, { id: 'x', name: 'X', archived: true }, { id: 'e', name: 'E' }],
      [{ routine_id: 'a', exercise_id: 'e2', position: 1, target_sets: 99 }, { routine_id: 'a', exercise_id: 'e1', position: 0, target_sets: null }, { routine_id: 'b', exercise_id: 'e1' }, { routine_id: 'x', exercise_id: 'e1' }],
    )
    expect(out.map((r) => r.id)).toEqual(['a', 'b'])
    expect(out[0].items.map((i) => [i.exercise_id, i.target_sets])).toEqual([['e1', 3], ['e2', 20]])
  })
  it('слияние: свежее побеждает, чужого не теряем, своё отправляем', () => {
    const local = [R('1', 'loc-new', '2026-02-01'), R('2', 'loc-old', '2026-01-01'), R('3', 'only-local', '2026-01-01')]
    const remote = [R('1', 'rem-old', '2026-01-01'), R('2', 'rem-new', '2026-02-01'), R('4', 'only-remote', '2026-01-01')]
    const { merged, toPush } = mergeRoutines(local, remote)
    expect(merged.map((r) => r.name)).toEqual(['loc-new', 'rem-new', 'only-local', 'only-remote'])
    expect(toPush.map((r) => r.id)).toEqual(['1', '3'])
  })
  it('равное время — сервер, ничего не отправляем', () => {
    const { merged, toPush } = mergeRoutines([R('1', 'l', '2026-01-01')], [R('1', 'r', '2026-01-01')])
    expect(merged[0].name).toBe('r'); expect(toPush).toEqual([])
  })
})
