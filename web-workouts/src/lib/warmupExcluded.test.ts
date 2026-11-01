import { describe, expect, it } from 'vitest'
import { bestSetRecord } from './workouts'
import { exercisePoints, overviewPoints } from './workoutCharts'
import { growthRows } from './growth'
import { setsByMuscle } from './muscleHeat'
import type { Exercise, WorkoutEntry } from './types'

// BACKLOG 69.4: разминочные (и невыполненные) подходы не портят рекорды, графики, рост и карту мышц; у старых записей без полей type/done всё считается как раньше.
const ex: Exercise = { id: 'x', user_id: 'u', name: 'Жим лёжа', category: null, tracks_weight: true, value_label: null, unit: null, suggested_scheme: null, created_at: '2026-01-01' }
const set = (reps: number, weight: number, extra: object = {}) => ({ reps, weight, time: null, duration: null, side: null, ...extra })
const entry = (date: string, sets: object[]): WorkoutEntry => ({ id: date, user_id: 'u', exercise_id: 'x', date, sets: sets as never, notes: null })

describe('разминка не в статистике', () => {
  const mixed = [entry('2026-10-30', [set(10, 200, { type: 'warmup' }), set(5, 100), set(3, 300, { done: false })])]
  it('рекорд карточки — по рабочему подходу', () => { expect(bestSetRecord(mixed, ex, 'kg')?.text).toBe('5×100kg') })
  it('график упражнения: максимум веса и подходов за день без разминки', () => {
    expect(exercisePoints(mixed, ex)).toEqual([{ date: '2026-10-30', y: 100 }])
    expect(overviewPoints(mixed)).toEqual([{ date: '2026-10-30', y: 1 }])
    expect(exercisePoints([entry('2026-10-30', [set(10, 200, { type: 'warmup' })])], ex)).toEqual([])
  })
  it('рост: лучший результат окна без разминки', () => {
    const cur = [entry('2026-10-10', [set(5, 100), set(10, 400, { type: 'warmup' })])]
    const prev = [entry('2026-09-20', [set(5, 90)])]
    const rows = growthRows([...prev, ...cur], [ex], '2026-10-13', 'kg')
    expect(rows[0].curText).toBe('5×100kg')
  })
  it('карта мышц: подходы считаются только рабочие', () => {
    const heat = setsByMuscle([entry('2026-10-30', [set(10, 20, { type: 'warmup' }), set(8, 60), set(8, 60)])], [ex], '2026-10-31', '2026-10-24')
    expect([...heat.values()].every((v) => v === 2)).toBe(true)
  })
  it('старые записи (без type/done) считаются целиком', () => {
    expect(exercisePoints([entry('2026-10-30', [set(5, 80), set(5, 90)])], ex)).toEqual([{ date: '2026-10-30', y: 90 }])
  })
})
