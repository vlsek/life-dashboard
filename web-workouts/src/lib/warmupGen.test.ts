import { describe, expect, it } from 'vitest'
import { DEFAULT_WARMUP, hasWarmup, insertWarmup, warmupPlan, workingWeightFor } from './warmupGen'
import { MAX_SETS, newDraft, type ActiveDraft } from './activeWorkout'
import type { SetV2 } from './sessionContract'

const set = (o: Partial<SetV2>): SetV2 => ({ reps: null, weight: null, time: null, duration: null, side: null, done: false, ...o })
const draftWith = (sets: SetV2[]): ActiveDraft => ({ ...newDraft('d1', new Date('2026-11-03T10:00:00')), exercises: [{ id: 'x1', exercise_id: 'e1', superset_group: null, note: null, sets }] })

describe('warmupPlan (69.15 срез 2)', () => {
  it('100 кг: 40/60/80% → 40×8, 60×5, 80×3', () => {
    expect(warmupPlan(100, 2.5)).toEqual([{ weight: 40, reps: 8 }, { weight: 60, reps: 5 }, { weight: 80, reps: 3 }])
  })
  it('вес округляется до ближайшего шага: 72 кг → 30 (28,8), 42,5 (43,2), 57,5 (57,6)', () => {
    expect(warmupPlan(72, 2.5).map((p) => p.weight)).toEqual([30, 42.5, 57.5])
  })
  it('фунты: шаг 5', () => {
    expect(warmupPlan(225, 5).map((p) => p.weight)).toEqual([90, 135, 180])
  })
  it('лёгкий вес сжимает схему: повторы веса и «не ниже рабочего» отбрасываются', () => {
    expect(warmupPlan(5, 2.5)).toEqual([{ weight: 2.5, reps: 8 }])
    for (const p of warmupPlan(7.5, 2.5)) expect(p.weight).toBeLessThan(7.5)
  })
  it('нулевой, отрицательный, нечисловой вес и негодный шаг — плана нет', () => {
    for (const w of [0, -10, NaN, Infinity]) expect(warmupPlan(w, 2.5)).toEqual([])
    expect(warmupPlan(100, 0)).toEqual([])
  })
  it('своя схема', () => {
    expect(warmupPlan(100, 5, [{ pct: 0.5, reps: 10 }])).toEqual([{ weight: 50, reps: 10 }])
    expect(DEFAULT_WARMUP).toHaveLength(3)
  })
})

describe('workingWeightFor', () => {
  it('первый свой подход с весом — разминочные пропускаются', () => {
    expect(workingWeightFor([set({ weight: 20, type: 'warmup' }), set({ weight: 100 }), set({ weight: 110 })], [])).toBe(100)
  })
  it('нет своего веса — самый тяжёлый РАБОЧИЙ выполненный подход прошлой тренировки', () => {
    const prev = [set({ weight: 30, done: true, type: 'warmup' }), set({ weight: 80, done: true }), set({ weight: 90, done: true }), set({ weight: 200, done: false })]
    expect(workingWeightFor([set({})], prev)).toBe(90)
  })
  it('нигде нет веса — null', () => {
    expect(workingWeightFor([set({})], [])).toBeNull()
    expect(workingWeightFor([set({ weight: 0 })], [set({ weight: null, done: true })])).toBeNull()
  })
})

describe('insertWarmup', () => {
  const plan = [{ weight: 40, reps: 8 }, { weight: 60, reps: 5 }]
  it('вставляет разминку В НАЧАЛО: типа warmup, не выполнена, рабочие подходы целы', () => {
    const d = draftWith([set({ weight: 100, reps: 5 })])
    const r = insertWarmup(d, 'x1', plan)
    const sets = r.exercises[0].sets
    expect(sets).toHaveLength(3)
    expect(sets.slice(0, 2).map((s) => [s.weight, s.reps, s.type, s.done])).toEqual([[40, 8, 'warmup', false], [60, 5, 'warmup', false]])
    expect(sets[2]).toMatchObject({ weight: 100, reps: 5 })
    expect(d.exercises[0].sets).toHaveLength(1) // исходный черновик не изменён
  })
  it('повторно не добавляет; hasWarmup видит разминку', () => {
    const once = insertWarmup(draftWith([set({ weight: 100 })]), 'x1', plan)
    expect(hasWarmup(once.exercises[0].sets)).toBe(true)
    expect(insertWarmup(once, 'x1', plan)).toBe(once)
  })
  it('пустой план и неизвестное упражнение — тот же объект', () => {
    const d = draftWith([set({ weight: 100 })])
    expect(insertWarmup(d, 'x1', [])).toBe(d)
    expect(insertWarmup(d, 'нет', plan)).toBe(d)
  })
  it('лимит подходов MAX_SETS не превышается', () => {
    const full = draftWith(Array.from({ length: MAX_SETS - 1 }, () => set({ weight: 100 })))
    expect(insertWarmup(full, 'x1', plan).exercises[0].sets).toHaveLength(MAX_SETS)
    const max = draftWith(Array.from({ length: MAX_SETS }, () => set({ weight: 100 })))
    expect(insertWarmup(max, 'x1', plan)).toBe(max)
  })
})
