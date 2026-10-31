import { describe, expect, it } from 'vitest'
import { e1rm, prSetText, setRecords, topKind } from './records'
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
