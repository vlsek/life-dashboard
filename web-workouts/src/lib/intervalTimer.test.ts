import { describe, expect, it } from 'vitest'
import {
  CLOCK_ZERO, INTERVAL_DEFAULT, INTERVAL_STORE_KEY, addLap, buildPhases, clockElapsed, clockPause, clockStart,
  fmtClock, fmtStopwatch, normalizeInterval, phaseAt, readInterval, totalSeconds, writeInterval,
} from './intervalTimer'

const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) } }

describe('normalizeInterval', () => {
  it('ограничивает значения и подставляет умолчания', () => {
    expect(normalizeInterval({ work: 0, rest: -5, rounds: 500 })).toEqual({ work: 1, rest: 0, rounds: 99 })
    expect(normalizeInterval({ work: NaN, rest: undefined, rounds: 'x' as unknown as number })).toEqual(INTERVAL_DEFAULT)
    expect(normalizeInterval(null)).toEqual(INTERVAL_DEFAULT)
    expect(normalizeInterval({ work: 20.6, rest: 10, rounds: 3 }).work).toBe(21)
  })
})

describe('buildPhases', () => {
  it('разминка, затем работа/отдых, после последней работы отдыха нет', () => {
    const p = buildPhases({ work: 20, rest: 10, rounds: 3 })
    expect(p.map((x) => x.kind)).toEqual(['warmup', 'work', 'rest', 'work', 'rest', 'work'])
    expect(p.map((x) => x.round)).toEqual([0, 1, 1, 2, 2, 3])
    expect(totalSeconds(p)).toBe(5 + 20 * 3 + 10 * 2)
  })
  it('отдых 0 — фазы отдыха пропускаются; warmup=0 — без отсчёта', () => {
    const p = buildPhases({ work: 30, rest: 0, rounds: 2 }, 0)
    expect(p.map((x) => x.kind)).toEqual(['work', 'work'])
  })
  it('один раунд — только работа', () => {
    expect(buildPhases({ work: 10, rest: 10, rounds: 1 }, 0).map((x) => x.kind)).toEqual(['work'])
  })
})

describe('phaseAt', () => {
  const p = buildPhases({ work: 20, rest: 10, rounds: 2 }) // 5 + 20 + 10 + 20
  it('переходы на границах и остаток секунд вверх', () => {
    expect(phaseAt(p, 0)).toMatchObject({ index: 0, left: 5, done: false })
    expect(phaseAt(p, 4_999)).toMatchObject({ index: 0, left: 1 })
    expect(phaseAt(p, 5_000)).toMatchObject({ index: 1, left: 20 })
    expect(phaseAt(p, 25_000).phase?.kind).toBe('rest')
    expect(phaseAt(p, 35_000)).toMatchObject({ index: 3, left: 20 })
  })
  it('после конца — done, отрицательное время считается нулём', () => {
    expect(phaseAt(p, 55_000)).toMatchObject({ done: true, phase: null, left: 0 })
    expect(phaseAt(p, -10).index).toBe(0)
  })
})

describe('clock (пауза/продолжить)', () => {
  it('копит время только пока идёт', () => {
    let c = clockStart(CLOCK_ZERO, 1_000)
    expect(clockElapsed(c, 4_000)).toBe(3_000)
    c = clockPause(c, 4_000)
    expect(clockElapsed(c, 9_000)).toBe(3_000)
    c = clockStart(c, 10_000)
    expect(clockElapsed(c, 12_000)).toBe(5_000)
  })
  it('повторный старт и пауза безвредны', () => {
    const c = clockStart(CLOCK_ZERO, 100)
    expect(clockStart(c, 500)).toBe(c)
    expect(clockPause(CLOCK_ZERO, 500)).toBe(CLOCK_ZERO)
  })
})

describe('форматы', () => {
  it('fmtClock', () => {
    expect(fmtClock(0)).toBe('0:00')
    expect(fmtClock(65)).toBe('1:05')
    expect(fmtClock(3600)).toBe('1:00:00')
    expect(fmtClock(3725)).toBe('1:02:05')
    expect(fmtClock(-3)).toBe('0:00')
  })
  it('fmtStopwatch с десятыми', () => {
    expect(fmtStopwatch(0)).toBe('0:00.0')
    expect(fmtStopwatch(65_450)).toBe('1:05.4')
  })
})

describe('addLap', () => {
  it('время круга — разница с прошлой отсечкой, новые сверху', () => {
    let laps = addLap([], 10_000)
    laps = addLap(laps, 25_000)
    expect(laps[0]).toEqual({ n: 2, split: 15_000, total: 25_000 })
    expect(laps[1]).toEqual({ n: 1, split: 10_000, total: 10_000 })
  })
})

describe('хранение', () => {
  it('сохраняет и читает с нормализацией, битый JSON даёт умолчания', () => {
    const s = mem()
    writeInterval({ work: 40, rest: 20, rounds: 5 }, s)
    expect(readInterval(s)).toEqual({ work: 40, rest: 20, rounds: 5 })
    s.setItem(INTERVAL_STORE_KEY, '{oops')
    expect(readInterval(s)).toEqual(INTERVAL_DEFAULT)
  })
})
