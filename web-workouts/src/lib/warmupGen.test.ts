import { describe, expect, it } from 'vitest'
import { beforeEach } from 'vitest'
import { DEFAULT_WARMUP, MAX_WARMUP_STEPS, WARMUP_KEY, formatScheme, hasWarmup, insertWarmup, parseScheme, readScheme, resetScheme, warmupPlan, workingWeightFor, writeScheme } from './warmupGen'
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

describe('настройка схемы разминки (69.15 срез 3)', () => {
  beforeEach(() => localStorage.clear())

  it('разбор: разделители x / х / × / *, знак %, пробелы, запятая и точка с запятой между шагами', () => {
    expect(parseScheme('40x8, 60x5, 80x3')).toEqual([{ pct: 0.4, reps: 8 }, { pct: 0.6, reps: 5 }, { pct: 0.8, reps: 3 }])
    expect(parseScheme(' 50 % × 10 ; 75%х4 ; 90*1')).toEqual([{ pct: 0.5, reps: 10 }, { pct: 0.75, reps: 4 }, { pct: 0.9, reps: 1 }])
  })
  it('дробный процент — только через точку; «42,5x6» отклоняется целиком, а не превращается в шаг «5x6»', () => {
    expect(parseScheme('42.5x6')).toEqual([{ pct: 0.425, reps: 6 }])
    expect(parseScheme('42,5x6')).toBeNull()
    expect(parseScheme('40x8, 62,5x4')).toBeNull()
  })
  it('строгий разбор: любой негодный шаг (процент не в (0,100), повторы не 1–30, мусор) отклоняет всю схему', () => {
    for (const bad of ['0x5', '100x5', '120x5', '50x0', '50x31', 'abc', '60x5, abc', '40x8, 6', 'x8', '60x'] ) expect(parseScheme(bad)).toBeNull()
    expect(parseScheme('')).toBeNull()
    expect(parseScheme(' ,; ')).toBeNull()
    expect(parseScheme('60x5,, 70x3;')).toEqual([{ pct: 0.6, reps: 5 }, { pct: 0.7, reps: 3 }]) // пустые куски между разделителями — не ошибка
  })
  it('шагов больше MAX_WARMUP_STEPS — схема отклоняется, ровно MAX_WARMUP_STEPS принимается', () => {
    const mk = (n: number) => Array.from({ length: n }, (_, i) => `${10 + i * 5}x5`).join(', ')
    expect(parseScheme(mk(MAX_WARMUP_STEPS))).toHaveLength(MAX_WARMUP_STEPS)
    expect(parseScheme(mk(MAX_WARMUP_STEPS + 1))).toBeNull()
  })
  it('formatScheme → parseScheme возвращает ту же схему, в том числе с дробным процентом', () => {
    expect(formatScheme(DEFAULT_WARMUP)).toBe('40x8, 60x5, 80x3')
    expect(parseScheme(formatScheme(DEFAULT_WARMUP))).toEqual([...DEFAULT_WARMUP])
    const odd = [{ pct: 0.425, reps: 6 }]
    expect(parseScheme(formatScheme(odd))).toEqual(odd)
  })
  it('хранение: по умолчанию, сохранённая схема, битое значение и сброс', () => {
    expect(readScheme()).toEqual([...DEFAULT_WARMUP])
    writeScheme([{ pct: 0.5, reps: 10 }])
    expect(readScheme()).toEqual([{ pct: 0.5, reps: 10 }])
    localStorage.setItem(WARMUP_KEY, 'не схема')
    expect(readScheme()).toEqual([...DEFAULT_WARMUP])
    writeScheme([{ pct: 0.5, reps: 10 }])
    expect(resetScheme()).toEqual([...DEFAULT_WARMUP])
    expect(localStorage.getItem(WARMUP_KEY)).toBeNull()
  })
  it('своя схема меняет план', () => {
    expect(warmupPlan(100, 2.5, parseScheme('50x10, 70x4')!)).toEqual([{ weight: 50, reps: 10 }, { weight: 70, reps: 4 }])
  })
})
