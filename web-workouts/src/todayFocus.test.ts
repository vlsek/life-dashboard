import { describe, expect, it } from 'vitest'
import { todayFocus } from './lib/todayFocus'
import { muscleBalance } from './lib/muscleBalance'

const ex = [
  { id: 'bench', name: 'Жим лёжа' },
  { id: 'row', name: 'Тяга штанги в наклоне' },
  { id: 'squat', name: 'Приседания со штангой' },
]
const S = (n: number, warm = false) => Array.from({ length: n }, () => ({ reps: 10, weight: 20, side: null, ...(warm ? { type: 'warmup' } : {}) })) as never
const E = (exercise_id: string, date: string, n: number, warm = false) => ({ exercise_id, date, sets: S(n, warm) }) as never

describe('todayFocus', () => {
  it('сортирует по дефициту и пропускает отдыхающие и закрытые группы', () => {
    const entries = [E('bench', '2026-11-01', 12), E('row', '2026-10-29', 4)]
    const f = todayFocus(entries, ex, '2026-11-02')
    const ms = f.map((x) => x.muscle)
    expect(ms).not.toContain('chest') // закрыта/отдыхает
    expect(ms).toContain('back')
    expect(f.find((x) => x.muscle === 'back')?.restDays).toBe(4)
    expect(f.find((x) => x.muscle === 'quads')?.restDays).toBeNull()
  })
  it('отдых меньше 2 дней — не предлагаем; не больше 3 групп', () => {
    const f = todayFocus([E('row', '2026-11-02', 2)], ex, '2026-11-02')
    expect(f.map((x) => x.muscle)).not.toContain('back')
    expect(f.length).toBeLessThanOrEqual(3)
  })
  it('нет упражнений — пусто', () => {
    expect(todayFocus([], [], '2026-11-02')).toEqual([])
  })
  it('разминка не считается', () => {
    const f = todayFocus([E('squat', '2026-10-30', 12, true)], [ex[2]], '2026-11-02')
    expect(f.find((x) => x.muscle === 'quads')?.sets).toBe(0)
    expect(muscleBalance([E('squat', '2026-11-01', 9, true)], ex, '2026-11-02', '2026-10-26').upperLower.b).toBe(0)
  })
})
