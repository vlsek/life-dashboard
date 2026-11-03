import { describe, expect, it } from 'vitest'
import { e1rm, prSetText, setRecords, topKind, exerciseBests } from './records'
import type { SetV2 } from './sessionContract'

const st = (reps: number | null, weight: number | null, x: Partial<SetV2> = {}): SetV2 => ({ reps, weight, time: null, duration: null, side: null, done: true, ...x })
const hist = (...sets: SetV2[]) => [{ sets }]

describe('рекорды', () => {
  it('больший вес — рекорд; равный — нет; первый подход в истории — нет', () => {
    expect(setRecords(hist(st(8, 60)), [st(5, 62.5)])[0]).toContain('weight')
    expect(setRecords(hist(st(8, 60)), [st(8, 60)])[0]).toEqual([])
    expect(setRecords([], [st(8, 60)])[0]).toEqual([])
  })
  it('больше повторов на том же весе; 1ПМ по Эпли', () => {
    const k = setRecords(hist(st(8, 60)), [st(10, 60)])[0]
    expect(k).toEqual(expect.arrayContaining(['reps', 'e1rm', 'volume'])); expect(k).not.toContain('weight')
    expect(e1rm(60, 10)).toBe(80); expect(e1rm(100, 1)).toBe(100)
  })
  it('разминка и невыполненный подход рекордов не дают и не поднимают планку', () => {
    const r = setRecords(hist(st(8, 60)), [st(5, 100, { type: 'warmup' }), st(5, 100, { done: false }), st(5, 62.5)])
    expect(r[0]).toEqual([]); expect(r[1]).toEqual([]); expect(r[2]).toContain('weight')
  })
  it('в разминке из ИСТОРИИ планка тоже не растёт', () => {
    expect(setRecords(hist(st(8, 60), st(3, 200, { type: 'warmup' })), [st(5, 62.5)])[0]).toContain('weight')
  })
  it('внутри тренировки планка растёт: повтор того же подхода — не рекорд', () => {
    const r = setRecords(hist(st(8, 60)), [st(5, 65), st(5, 65), st(5, 67.5)])
    expect(r[0]).toContain('weight'); expect(r[1]).toEqual([]); expect(r[2]).toContain('weight')
  })
  it('без веса: максимум повторов; время: больше длительность', () => {
    expect(setRecords(hist(st(10, null)), [st(12, null)])[0]).toEqual(['reps'])
    expect(setRecords(hist(st(10, null)), [st(10, null)])[0]).toEqual([])
    expect(setRecords(hist(st(null, null, { duration: 20 })), [st(null, null, { duration: 25 })])[0]).toEqual(['duration'])
  })
  it('показываем самый важный и формат текста', () => {
    expect(topKind(['e1rm', 'volume'])).toBe('e1rm'); expect(topKind([])).toBeNull()
    expect(prSetText(st(8, 62.5), 'кг')).toBe('62,5 кг × 8')
  })
})

describe('exerciseBests (страница «Рекорды»)', () => {
  const st = (weight: number, reps: number, extra: object = {}) => ({ reps, weight, time: null, duration: null, side: null, ...extra })
  it('лучшие значения с датой первого достижения; разминка и невыполненные не считаются', () => {
    const b = exerciseBests([
      { date: '2026-03-01', sets: [st(100, 5), st(80, 8)] },
      { date: '2026-01-01', sets: [st(100, 3), st(60, 12)] },
      { date: '2026-02-01', sets: [st(140, 1, { type: 'warmup' }), st(120, 5, { done: false })] },
    ])
    expect(b.weight).toMatchObject({ value: 100, date: '2026-01-01' })
    expect(b.volume).toMatchObject({ value: 720, weight: 60, reps: 12 })
    expect(b.reps).toMatchObject({ value: 12 })
    expect(b.e1rm?.value).toBeCloseTo(116.67, 1)
    expect(b.repsAt.map((r) => [r.weight, r.reps])).toEqual([[100, 5], [80, 8], [60, 12]])
  })
  it('пусто — всё null; повторы без веса и время тоже рекорды', () => {
    expect(exerciseBests([])).toMatchObject({ weight: null, reps: null, repsAt: [] })
    const b = exerciseBests([{ date: '2026-01-01', sets: [{ reps: 15, weight: null, time: null, duration: 20, side: null }] }])
    expect(b.reps).toMatchObject({ value: 15, weight: null }); expect(b.duration?.value).toBe(20); expect(b.weight).toBeNull()
  })
})
