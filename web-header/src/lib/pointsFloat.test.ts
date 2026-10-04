// КОПИЯ web-dashboard/src/lib/pointsFloat.test.ts (BACKLOG 469, агент 2).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POINTS_FLOAT, clampX, emitPointsFloat, formatPointsDelta, motionMode, pickOrigin, pointsDelta, type PointsFloatDetail } from './pointsFloat'

function metric(o: Partial<any>): any {
  return { id: 'm1', name: 'M', icon: null, type: 'boolean', unit: null, goal_value: null, goal_direction: null, schedule: null, category_id: null, position: 0, ...o }
}

describe('pointsDelta: «+1 / −1» только при переходе выполнено ↔ не выполнено', () => {
  it('boolean: отметил = +1, снял = −1, повтор = 0', () => {
    const m = metric({ type: 'boolean' })
    expect(pointsDelta(m, false, true)).toBe(1)
    expect(pointsDelta(m, undefined, true)).toBe(1)
    expect(pointsDelta(m, true, false)).toBe(-1)
    expect(pointsDelta(m, true, true)).toBe(0)
    expect(pointsDelta(m, false, false)).toBe(0)
  })
  it('number «не меньше цели»: баллы только при пересечении цели', () => {
    const m = metric({ type: 'number', goal_value: 10, goal_direction: 'at_least' })
    expect(pointsDelta(m, 3, 5)).toBe(0)
    expect(pointsDelta(m, 8, 10)).toBe(1)
    expect(pointsDelta(m, 10, 14)).toBe(0)
    expect(pointsDelta(m, 12, 4)).toBe(-1)
  })
  it('number «не больше цели» (at_most): засчитывается 0 < значение < цели', () => {
    const m = metric({ type: 'number', goal_value: 5, goal_direction: 'at_most' })
    expect(pointsDelta(m, undefined, 3)).toBe(1)
    expect(pointsDelta(m, 3, 7)).toBe(-1)
  })
  it('multiselect: первый выбранный вариант +1, снятие последнего −1', () => {
    const m = metric({ type: 'multiselect' })
    expect(pointsDelta(m, [], ['a'])).toBe(1)
    expect(pointsDelta(m, ['a'], ['a', 'b'])).toBe(0)
    expect(pointsDelta(m, ['a'], [])).toBe(-1)
  })
  it('sets: считается сумма повторений против цели', () => {
    const m = metric({ type: 'sets', goal_value: 20, goal_direction: 'at_least' })
    expect(pointsDelta(m, [{ reps: 10 }] as any, [{ reps: 10 }, { reps: 10 }] as any)).toBe(1)
    expect(pointsDelta(m, [{ reps: 10 }, { reps: 10 }] as any, [{ reps: 10 }] as any)).toBe(-1)
    expect(pointsDelta(m, [] as any, [{ reps: 5 }] as any)).toBe(0)
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
