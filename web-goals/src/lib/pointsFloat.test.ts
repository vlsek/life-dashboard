import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POINTS_FLOAT, clampX, completionDelta, emitPointsFloat, formatPointsDelta, motionMode, pickOrigin, type PointsFloatDetail } from './pointsFloat'

describe('completionDelta: очки при смене статуса «закрыто»', () => {
  it('закрыл → +points, снял отметку → −points', () => {
    expect(completionDelta(false, true, 5, 5)).toBe(5)
    expect(completionDelta(true, false, 5, 5)).toBe(-5)
    expect(completionDelta(false, true, 20, 10)).toBe(20)
  })
  it('статус не менялся → 0 (анимировать нечего)', () => {
    expect(completionDelta(false, false, 5, 5)).toBe(0)
    expect(completionDelta(true, true, 5, 5)).toBe(0)
  })
  it('очков нет (null/undefined) → по умолчанию, как в балансе; явный 0 остаётся 0', () => {
    expect(completionDelta(false, true, null, 10)).toBe(10)
    expect(completionDelta(true, false, undefined, 5)).toBe(-5)
    expect(completionDelta(false, true, 0, 10)).toBe(0)
  })
})

describe('formatPointsDelta', () => {
  it('плюс/минус и целые числа; минус — U+2212, не дефис', () => {
    expect(formatPointsDelta(1, 'ru')).toBe('+1')
    expect(formatPointsDelta(-1, 'ru')).toBe('\u22121')
    expect(formatPointsDelta(-1, 'ru')).not.toContain('-')
    expect(formatPointsDelta(5, 'en')).toBe('+5')
  })
  it('дробные баллы (задел под «+0,2 за подход»): локальный разделитель', () => {
    expect(formatPointsDelta(0.2, 'ru')).toBe('+0,2')
    expect(formatPointsDelta(0.2, 'en')).toBe('+0.2')
    expect(formatPointsDelta(-0.5, 'ru')).toBe('\u22120,5')
  })
  it('ноль, NaN и Infinity → пустая строка', () => {
    expect(formatPointsDelta(0)).toBe('')
    expect(formatPointsDelta(NaN)).toBe('')
    expect(formatPointsDelta(Infinity)).toBe('')
  })
})

describe('emitPointsFloat', () => {
  const got: PointsFloatDetail[] = []
  const on = (e: Event) => got.push((e as CustomEvent<PointsFloatDetail>).detail)
  beforeEach(() => {
    got.length = 0
    window.addEventListener(POINTS_FLOAT, on)
  })
  afterEach(() => window.removeEventListener(POINTS_FLOAT, on))

  it('шлёт событие с delta', () => {
    emitPointsFloat(1)
    emitPointsFloat(-1)
    expect(got).toEqual([{ delta: 1 }, { delta: -1 }])
  })
  it('молчит при 0 и нечисловых значениях', () => {
    emitPointsFloat(0)
    emitPointsFloat(NaN)
    expect(got).toEqual([])
  })
})

describe('pickOrigin / clampX', () => {
  it('берёт точку недавнего клика, а старую или отсутствующую — нет', () => {
    expect(pickOrigin({ x: 10, y: 20, at: 1000 }, 2000)).toEqual({ x: 10, y: 20 })
    expect(pickOrigin({ x: 10, y: 20, at: 1000 }, 9000)).toBeNull()
    expect(pickOrigin(null, 1000)).toBeNull()
    expect(pickOrigin({ x: 1, y: 1, at: 5000 }, 1000)).toBeNull() // часы «назад» — не доверяем
  })
  it('не даёт подписи вылезти за край экрана', () => {
    expect(clampX(5, 360)).toBe(44)
    expect(clampX(500, 360)).toBe(316)
    expect(clampX(180, 360)).toBe(180)
    expect(clampX(10, 60)).toBe(30) // экран уже подписи — по центру
  })
})

describe('motionMode', () => {
  afterEach(() => {
    delete document.documentElement.dataset.motion
    vi.unstubAllGlobals()
  })
  it('по умолчанию full', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    expect(motionMode()).toBe('full')
  })
  it('prefers-reduced-motion → reduced', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    expect(motionMode()).toBe('reduced')
  })
  it('<html data-motion="off"> → off (важнее reduced)', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    document.documentElement.dataset.motion = 'off'
    expect(motionMode()).toBe('off')
  })
})
