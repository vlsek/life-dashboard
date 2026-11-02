import { describe, expect, it } from 'vitest'
import { isSkewed, muscleBalance } from './lib/muscleBalance'

const ex = [
  { id: 'bench', name: 'Жим лёжа' },
  { id: 'row', name: 'Тяга штанги в наклоне' },
  { id: 'squat', name: 'Приседания со штангой' },
  { id: 'curl', name: 'Сгибание рук с гантелями' },
]
const sets = (n: number, side: 'L' | 'R' | null = null, reps = 10) => Array.from({ length: n }, () => ({ reps, weight: 20, side })) as never
const E = (exercise_id: string, n: number, side: 'L' | 'R' | null = null, reps = 10) => ({ exercise_id, date: '2026-11-01', sets: sets(n, side, reps) }) as never

describe('muscleBalance', () => {
  it('считает толкай/тяни и верх/низ', () => {
    const b = muscleBalance([E('bench', 6), E('row', 2), E('squat', 4)], ex, '2026-11-02', '2026-10-26')
    expect(b.pushPull.a).toBe(6)
    expect(b.pushPull.b).toBe(2)
    expect(b.upperLower.a).toBeGreaterThan(b.upperLower.b)
    expect(b.upperLower.b).toBe(4)
  })
  it('мало данных → share null', () => {
    const b = muscleBalance([E('bench', 2)], ex, '2026-11-02', '2026-10-26')
    expect(b.pushPull.share).toBeNull()
    expect(b.leftRight.share).toBeNull()
    expect(b.leftRight.gapPct).toBeNull()
  })
  it('лево/право по повторам и без стороны — нет данных', () => {
    const b = muscleBalance([E('curl', 3, 'L', 8), E('curl', 3, 'R', 10)], ex, '2026-11-02', '2026-10-26')
    expect(b.leftRight.gapPct).toBe(20)
    const none = muscleBalance([E('curl', 8)], ex, '2026-11-02', '2026-10-26')
    expect(none.leftRight.share).toBeNull()
  })
  it('вне периода не считается', () => {
    const old = { exercise_id: 'bench', date: '2026-01-01', sets: sets(9) } as never
    expect(muscleBalance([old], ex, '2026-11-02', '2026-10-26').pushPull.a).toBe(0)
  })
  it('isSkewed', () => {
    expect(isSkewed(null)).toBe(false)
    expect(isSkewed(0.5)).toBe(false)
    expect(isSkewed(0.7)).toBe(true)
    expect(isSkewed(0.3)).toBe(true)
  })
})
