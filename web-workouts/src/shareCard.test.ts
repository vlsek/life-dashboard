import { describe, expect, it } from 'vitest'
import { shareData, SHARE_MAX_ROWS } from './lib/shareCard'

const ex = [
  { id: 'bench', name: 'Жим лёжа' },
  { id: 'squat', name: 'Приседания со штангой' },
]
const S = (n: number, type?: string) => Array.from({ length: n }, () => ({ reps: 10, weight: 20, side: null, ...(type ? { type } : {}) })) as never
const E = (exercise_id: string, date: string, n: number, type?: string) => ({ exercise_id, date, sets: S(n, type) }) as never

describe('shareData', () => {
  it('считает подходы по группам, итог и тренировочные дни; сортирует по убыванию', () => {
    const d = shareData([E('bench', '2026-11-01', 5), E('bench', '2026-11-02', 3), E('squat', '2026-11-02', 4)], ex, '2026-11-02', '2026-10-27', 7)
    expect(d.totalSets).toBe(12)
    expect(d.workoutDays).toBe(2)
    expect(d.rows[0].sets).toBeGreaterThanOrEqual(d.rows[d.rows.length - 1].sets)
    expect(d.rows.find((r) => r.muscle === 'chest')?.sets).toBe(8)
  })
  it('разминка и записи вне периода не считаются; пусто — нет строк', () => {
    const d = shareData([E('bench', '2026-11-02', 6, 'warmup'), E('bench', '2026-09-01', 9)], ex, '2026-11-02', '2026-10-27', 7)
    expect(d.totalSets).toBe(0)
    expect(d.workoutDays).toBe(0)
    expect(d.rows).toEqual([])
  })
  it('не больше SHARE_MAX_ROWS строк и нет личных полей', () => {
    const d = shareData([E('bench', '2026-11-02', 2)], ex, '2026-11-02', '2026-10-27', 7)
    expect(d.rows.length).toBeLessThanOrEqual(SHARE_MAX_ROWS)
    expect(Object.keys(d).sort()).toEqual(['days', 'from', 'rows', 'to', 'totalSets', 'workoutDays'])
  })
})
