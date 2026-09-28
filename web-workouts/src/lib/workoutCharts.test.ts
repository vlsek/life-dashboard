import { describe, expect, it } from 'vitest'
import { exercisePoints, overviewPoints } from './workoutCharts'
import type { WorkoutEntry } from './types'

const entry = (date: string, sets: Array<{ reps?: number | null; weight?: number | null }>): WorkoutEntry => ({
  id: date, user_id: 'u', exercise_id: 'e', date, notes: null,
  sets: sets.map((s) => ({ reps: s.reps ?? null, weight: s.weight ?? null })) as WorkoutEntry['sets'],
})

describe('overviewPoints (сумма КОЛИЧЕСТВА подходов по дням — общий объём активности)', () => {
  it('вручную: 01.01 → 2+3=5 подходов, 02.01 → 1 подход', () => {
    const entries = [entry('2026-01-01', [{ reps: 10 }, { reps: 8 }]), entry('2026-01-01', [{ weight: 20 }, { weight: 20 }, { weight: 20 }]), entry('2026-01-02', [{ reps: 5 }])]
    expect(overviewPoints(entries)).toEqual([{ date: '2026-01-01', y: 5 }, { date: '2026-01-02', y: 1 }])
  })
  it('запись без подходов не создаёт точку 0, а просто не учитывается', () => {
    expect(overviewPoints([entry('2026-01-01', [])])).toEqual([])
  })
  it('сортировка по дате независимо от порядка входных записей', () => {
    const entries = [entry('2026-01-05', [{ reps: 1 }]), entry('2026-01-01', [{ reps: 1 }]), entry('2026-01-03', [{ reps: 1 }])]
    expect(overviewPoints(entries).map((p) => p.date)).toEqual(['2026-01-01', '2026-01-03', '2026-01-05'])
  })
  it('пусто на входе — пусто на выходе', () => {
    expect(overviewPoints([])).toEqual([])
  })
})

describe('exercisePoints: с весом — максимум веса за день', () => {
  const withWeight = { tracks_weight: true }
  it('вручную: 01.01 максимум из [20, 25, null] → 25; 02.01 максимум из [30] → 30', () => {
    const entries = [entry('2026-01-01', [{ weight: 20 }, { weight: 25 }, { weight: null, reps: 12 }]), entry('2026-01-02', [{ weight: 30 }])]
    expect(exercisePoints(entries, withWeight)).toEqual([{ date: '2026-01-01', y: 25 }, { date: '2026-01-02', y: 30 }])
  })
  it('день без единого веса пропускается (а не 0)', () => {
    expect(exercisePoints([entry('2026-01-01', [{ reps: 10 }])], withWeight)).toEqual([])
  })
})

describe('exercisePoints: без веса — сумма повторений за день', () => {
  const noWeight = { tracks_weight: false }
  it('вручную: 01.01 → 10+8=18, повтор с null пропускается в сумме, но день учитывается', () => {
    const entries = [entry('2026-01-01', [{ reps: 10 }, { reps: 8 }, { reps: null }])]
    expect(exercisePoints(entries, noWeight)).toEqual([{ date: '2026-01-01', y: 18 }])
  })
  it('день без единого reps пропускается (а не 0)', () => {
    expect(exercisePoints([entry('2026-01-01', [{ weight: 20 }])], noWeight)).toEqual([])
  })
  it('сортировка по дате', () => {
    const entries = [entry('2026-01-03', [{ reps: 5 }]), entry('2026-01-01', [{ reps: 5 }])]
    expect(exercisePoints(entries, noWeight).map((p) => p.date)).toEqual(['2026-01-01', '2026-01-03'])
  })
})
