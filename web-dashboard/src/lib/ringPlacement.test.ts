import { describe, it, expect } from 'vitest'
import { dayRingTarget, weekRingTarget, circleGeometry, squareGeometry } from './ringPlacement'

describe('dayRingTarget', () => {
  it('avatar / header when there is data', () => {
    expect(dayRingTarget('avatar', true)).toBe('avatar')
    expect(dayRingTarget('header', true)).toBe('header')
  })
  it('null when off or when there is nothing to show', () => {
    expect(dayRingTarget('off', true)).toBeNull()
    expect(dayRingTarget('avatar', false)).toBeNull()
    expect(dayRingTarget('header', false)).toBeNull()
  })
})

describe('weekRingTarget', () => {
  it('profile / header when there is data', () => {
    expect(weekRingTarget('profile', true)).toBe('profile')
    expect(weekRingTarget('header', true)).toBe('header')
  })
  it('null when off or no data', () => {
    expect(weekRingTarget('off', true)).toBeNull()
    expect(weekRingTarget('profile', false)).toBeNull()
  })
})

describe('circleGeometry', () => {
  it('offset shrinks as the base fraction grows; empty = full circumference, done = 0', () => {
    const c = 2 * Math.PI * 24
    expect(circleGeometry(24, 0, 0).offsetBase).toBeCloseTo(c)
    expect(circleGeometry(24, 0.5, 0).offsetBase).toBeCloseTo(c / 2)
    expect(circleGeometry(24, 1, 0).offsetBase).toBeCloseTo(0)
  })
  it('bonus layer is capped at a full circle', () => {
    expect(circleGeometry(24, 1, 40).offsetBonus).toBeCloseTo(2 * Math.PI * 24 * 0.6)
    expect(circleGeometry(24, 1, 250).offsetBonus).toBeCloseTo(0)
    expect(circleGeometry(24, 1, 0).offsetBonus).toBeCloseTo(2 * Math.PI * 24)
  })
})

describe('squareGeometry', () => {
  it('perimeter of a rounded square: 4 straight sides + 4 corner arcs', () => {
    expect(squareGeometry(24, 6, 0, 0).perimeter).toBeCloseTo(4 * 12 + 2 * Math.PI * 6)
  })
  it('offsets follow the same base/bonus rules as the circle', () => {
    const g = squareGeometry(24, 6, 0.25, 50)
    expect(g.offsetBase).toBeCloseTo(g.perimeter * 0.75)
    expect(g.offsetBonus).toBeCloseTo(g.perimeter * 0.5)
  })
})
