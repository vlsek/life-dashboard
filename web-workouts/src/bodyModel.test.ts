import { describe, expect, it } from 'vitest'
import { BODY_OUTLINE, FRONT_SHAPES, BACK_SHAPES } from './lib/muscleShapes'
import { FEMALE_BACK_SHAPES, FEMALE_FRONT_SHAPES, FEMALE_OUTLINE, bodyGeometry, feminizePath, resolveBodyModel, widthFactor } from './lib/bodyModel'

const nums = (d: string) => (d.match(/-?\d*\.?\d+/g) ?? []).map(Number)
const xsAtY = (d: string, lo: number, hi: number) => {
  const n = nums(d)
  const out: number[] = []
  for (let i = 0; i + 1 < n.length; i += 2) if (n[i + 1] >= lo && n[i + 1] <= hi) out.push(n[i])
  return out
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
    const w = (d: string, lo: number, hi: number) => {
      const xs = xsAtY(d, lo, hi)
      return Math.max(...xs) - Math.min(...xs)
    }
    expect(w(FEMALE_OUTLINE, 104, 112)).toBeGreaterThan(w(BODY_OUTLINE, 104, 112))
    expect(w(FEMALE_OUTLINE, 73, 77)).toBeLessThan(w(BODY_OUTLINE, 73, 77))
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
    expect(maxDx(FEMALE_OUTLINE)).toBeLessThanOrEqual(maxDx(BODY_OUTLINE))
  })
})
