import { describe, expect, it } from 'vitest'
import { BODY_OUTLINE, FRONT_SHAPES, BACK_SHAPES } from './lib/muscleShapes'
import { BODY_MODELS, FEMALE_BACK_SHAPES, FEMALE_FRONT_SHAPES, FEMALE_OUTLINE, bodyGeometry, factorAt, feminizePath, resolveBodyModel, widthFactor } from './lib/bodyModel'

const nums = (d: string) => (d.match(/-?\d*\.?\d+/g) ?? []).map(Number)
const xsAtY = (d: string, lo: number, hi: number) => {
  const n = nums(d)
  const out: number[] = []
  for (let i = 0; i + 1 < n.length; i += 2) if (n[i + 1] >= lo && n[i + 1] <= hi) out.push(n[i])
  return out
}

// ширина туловища без рук: берём только точки не дальше 22 единиц от оси (руки лежат дальше)
const torso = (d: string, lo: number, hi: number, cap = 22) => {
  const xs = xsAtY(d, lo, hi).filter((x) => Math.abs(x - 50) <= cap)
  return Math.max(...xs) - Math.min(...xs)
}

describe('Женская модель тела (54.5)', () => {
  it('профиль ширины: шея/голова без изменений, талия уже, бёдра шире', () => {
    expect(widthFactor(10)).toBe(1)
    expect(widthFactor(75)).toBeLessThan(1)
    expect(widthFactor(100)).toBeGreaterThan(1)
    expect(widthFactor(181)).toBe(1)
  })

  it('тот же набор мышц и то же число фигур, что у мужской модели', () => {
    expect(FEMALE_FRONT_SHAPES.map((s) => s.muscle)).toEqual(FRONT_SHAPES.map((s) => s.muscle))
    expect(FEMALE_BACK_SHAPES.map((s) => s.muscle)).toEqual(BACK_SHAPES.map((s) => s.muscle))
  })

  it('на уровне бёдер (y≈104–112) контур шире, на уровне талии (y≈75) уже', () => {
    expect(torso(FEMALE_OUTLINE, 104, 112)).toBeGreaterThan(torso(BODY_OUTLINE, 104, 112))
    expect(torso(FEMALE_OUTLINE, 73, 77, 16)).toBeLessThan(torso(FEMALE_OUTLINE, 104, 112) * 0.7)
  })

  it('ось симметрии x=50 и координаты y не меняются, число чисел то же', () => {
    const d = 'M50 100 L30 100 C20 90 10 80 5 75 Z'
    const f = feminizePath(d)
    expect(f.startsWith('M50 100')).toBe(true)
    expect(nums(f).length).toBe(nums(d).length)
    expect(nums(f).filter((_, i) => i % 2 === 1)).toEqual(nums(d).filter((_, i) => i % 2 === 1))
  })

  it('bodyGeometry выбирает модель', () => {
    expect(bodyGeometry('male').outline).toBe(BODY_OUTLINE)
    expect(bodyGeometry('female').outline).toBe(FEMALE_OUTLINE)
  })

  it('выбор модели: явный выбор главнее пола профиля, без выбора — пол, иначе мужская', () => {
    expect(resolveBodyModel('male', 'female')).toBe('male')
    expect(resolveBodyModel('female', 'male')).toBe('female')
    expect(resolveBodyModel(null, 'female')).toBe('female')
    expect(resolveBodyModel(null, null)).toBe('male')
    expect(resolveBodyModel('junk', 'male')).toBe('male')
  })

  it('руки следуют за плечами, а не за бёдрами: кисти женской модели не шире мужских (иначе рука ломается)', () => {
    const maxDx = (d: string) => Math.max(...xsAtY(d, 90, 104).map((x) => Math.abs(x - 50)))
    // руки отведены от корпуса (58.2, чтобы была видна талия), но не уходят далеко: не более чем на 4 единицы шире мужских
    expect(maxDx(FEMALE_OUTLINE)).toBeLessThanOrEqual(maxDx(BODY_OUTLINE) + 4)
  })
})

describe('«более женственная» модель (BACKLOG 57.4)', () => {
  const w = (d: string, lo: number, hi: number) => {
    const xs = xsAtY(d, lo, hi)
    return Math.max(...xs) - Math.min(...xs)
  }
  it('песочные часы: плечи уже, талия заметно уже мужской, бёдра шире', () => {
    expect(w(FEMALE_OUTLINE, 36, 40)).toBeLessThan(w(BODY_OUTLINE, 36, 40) * 0.96)
    expect(torso(FEMALE_OUTLINE, 104, 112)).toBeGreaterThan(torso(BODY_OUTLINE, 104, 112) * 1.1)
    expect(torso(FEMALE_OUTLINE, 73, 77, 16)).toBeLessThan(torso(FEMALE_OUTLINE, 104, 112) * 0.65) // талия (58.2): заметно уже бёдер
    // мышцы живота (на талии) у женской модели уже: проверяем по ширине пресса
    const abs = (shapes: typeof FEMALE_FRONT_SHAPES) => String(shapes.find((s) => s.muscle === 'abs')!.attrs.d)
    expect(w(abs(FEMALE_FRONT_SHAPES), 55, 87)).toBeLessThan(w(abs(FRONT_SHAPES), 55, 87) * 0.95)
  })
  it('длинные прямые отрезки режутся на части, чтобы профиль ложился плавно (талия видна на боку)', () => {
    const f = feminizePath('M30 60 L30 100')
    expect((f.match(/L/g) ?? []).length).toBeGreaterThanOrEqual(6)
  })
  it('нет ступеньки у подмышки: коэффициент ширины меняется плавно вдоль x', () => {
    const f = (x: number) => factorAt(x, 67)
    for (let x = 14; x < 50; x += 1) expect(Math.abs(f(x) - f(x + 1))).toBeLessThan(0.06)
  })
})

describe('новые модели тела (BACKLOG 59.2)', () => {
  it('все пять моделей: один набор мышц, разные контуры, выбор сохраняется', () => {
    expect(BODY_MODELS).toEqual(['male', 'female', 'chibi', 'leggy', 'stocky'])
    const outlines = new Set(BODY_MODELS.map((m) => bodyGeometry(m).outline))
    expect(outlines.size).toBe(5)
    for (const m of BODY_MODELS) {
      expect(bodyGeometry(m).front.map((s) => s.muscle)).toEqual(FRONT_SHAPES.map((s) => s.muscle))
      expect(resolveBodyModel(m, 'male')).toBe(m)
    }
    expect(resolveBodyModel('nope', 'female')).toBe('female')
  })
  it('концептуально разные пропорции (а не растянутые/сжатые): размер головы и длина ног', () => {
    const head = (m: Parameters<typeof bodyGeometry>[0]) => bodyGeometry(m).head
    expect(head('male')).toEqual({ cx: 50, cy: 14, r: 9 })
    expect(head('chibi').r).toBeGreaterThan(head('male').r * 1.8) // огромная голова
    expect(head('leggy').r).toBeLessThan(head('male').r * 0.9) // маленькая голова
    for (const m of ['chibi', 'leggy', 'stocky'] as const) expect(head(m).cy - head(m).r).toBeCloseTo(5, 1) // макушка на одной высоте
    // длина ног = от промежности (точка контура на оси x = 50, у мужской y = 119) до стоп (y = 181)
    const legs = (m: Parameters<typeof bodyGeometry>[0]) => {
      const n = (bodyGeometry(m).outline.match(/-?\d*\.?\d+/g) ?? []).map(Number)
      for (let k = 0; k + 1 < n.length; k += 2) if (Math.abs(n[k] - 50) < 0.5 && n[k + 1] > 90) return 181 - n[k + 1]
      return NaN
    }
    expect(legs('chibi')).toBeLessThan(legs('male') * 0.85)
    expect(legs('leggy')).toBeGreaterThan(legs('male') * 1.1)
    // стопы везде на одной высоте, шея и голова не разъезжаются: контур начинается на окружности головы
    for (const m of ['chibi', 'leggy', 'stocky'] as const) {
      const g = bodyGeometry(m)
      const [x0, y0] = (g.outline.match(/-?\d*\.?\d+/g) ?? []).map(Number)
      expect(Math.hypot(x0 - g.head.cx, y0 - g.head.cy)).toBeCloseTo(g.head.r, 0)
      expect(Math.max(...(g.outline.match(/-?\d*\.?\d+/g) ?? []).map(Number).filter((_, i) => i % 2 === 1))).toBeCloseTo(181, 0)
    }
  })
  it('старые выборы (атлетичная/стройная/плотная) больше не модели: возвращаемся к полу профиля', () => {
    for (const old of ['athletic', 'slim', 'curvy']) expect(resolveBodyModel(old, 'female')).toBe('female')
  })
})
