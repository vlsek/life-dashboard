import { describe, it, expect } from 'vitest'
import { findWaterMetric, findWeightParam, autoNormMlFromWeight, effectiveNormMl, nextWaterValue, waterPct, glassLevel } from './water'
import type { Metric } from './types'
import type { BodyParameter } from './water'

function metric(overrides: Partial<Metric>): Metric {
  return {
    id: 'm1',
    user_id: 'u1',
    name: 'Test',
    icon: null,
    type: 'number',
    unit: null,
    goal_value: null,
    goal_direction: null,
    schedule: null,
    category_id: null,
    position: 0,
    ...overrides,
  }
}

describe('findWaterMetric', () => {
  it('finds the metric by droplet icon emoji', () => {
    const metrics = [metric({ id: 'a', name: 'Foo', icon: '🏋️' }), metric({ id: 'b', name: 'Bar', icon: '💧' })]
    expect(findWaterMetric(metrics)?.id).toBe('b')
  })

  it('finds the metric by svg: droplet icon', () => {
    const metrics = [metric({ id: 'a', name: 'Foo', icon: 'svg:droplet' })]
    expect(findWaterMetric(metrics)?.id).toBe('a')
  })

  it('falls back to matching the name in Russian or English when the icon is not set', () => {
    expect(findWaterMetric([metric({ id: 'a', name: 'Вода', icon: null })])?.id).toBe('a')
    expect(findWaterMetric([metric({ id: 'b', name: 'Water', icon: null })])?.id).toBe('b')
  })

  it('returns undefined when nothing matches', () => {
    expect(findWaterMetric([metric({ name: 'Push-ups', icon: '💪' })])).toBeUndefined()
  })
})

function param(overrides: Partial<BodyParameter>): BodyParameter {
  return { id: 'p1', name: 'Test', icon: null, ...overrides }
}

describe('findWeightParam', () => {
  it('finds the parameter by scale icon or by name', () => {
    expect(findWeightParam([param({ id: 'a', icon: '⚖' })])?.id).toBe('a')
    expect(findWeightParam([param({ id: 'b', icon: null, name: 'Вес' })])?.id).toBe('b')
    expect(findWeightParam([param({ id: 'c', icon: null, name: 'Weight' })])?.id).toBe('c')
    expect(findWeightParam([param({ icon: null, name: 'Height' })])).toBeUndefined()
  })
})

describe('autoNormMlFromWeight', () => {
  it('applies the ~30ml per kg rule, rounded', () => {
    expect(autoNormMlFromWeight(70)).toBe(2100)
    expect(autoNormMlFromWeight(65.4)).toBe(1962)
  })
})

describe('effectiveNormMl', () => {
  it('prefers a manually-set goal over the auto norm', () => {
    expect(effectiveNormMl(2500, 2100)).toBe(2500)
  })
  it('falls back to the auto norm when no goal is set', () => {
    expect(effectiveNormMl(null, 2100)).toBe(2100)
    expect(effectiveNormMl(undefined, 2100)).toBe(2100)
  })
  it('falls back to 2000 when neither is available', () => {
    expect(effectiveNormMl(null, null)).toBe(2000)
  })
})

describe('nextWaterValue', () => {
  it('adds the delta to the current value', () => {
    expect(nextWaterValue(500, 200)).toBe(700)
  })
  it('never goes below zero, even with a large negative delta', () => {
    expect(nextWaterValue(100, -500)).toBe(0)
  })
})

describe('waterPct', () => {
  it('computes a 0..1 fraction of the norm', () => {
    expect(waterPct(1000, 2000)).toBe(0.5)
    expect(waterPct(2000, 2000)).toBe(1)
  })
  it('clamps at 1 when over the norm', () => {
    expect(waterPct(3000, 2000)).toBe(1)
  })
  it('is 0 when there is no norm yet, avoiding a divide by zero', () => {
    expect(waterPct(500, 0)).toBe(0)
  })
})

describe('glassLevel', () => {
  it('is at the bottom of the glass (levelY 22.5) when empty, no wave', () => {
    const l = glassLevel(0)
    expect(l.levelY).toBe(22.5)
    expect(l.waveAmp).toBe(0)
  })
  it('is at the top of the glass (levelY 6) when full, no wave', () => {
    const l = glassLevel(1)
    expect(l.levelY).toBe(6)
    expect(l.waveAmp).toBe(0)
  })
  it('has a wave only strictly between empty and full', () => {
    const l = glassLevel(0.5)
    expect(l.levelY).toBeCloseTo(14.25)
    expect(l.waveAmp).toBe(1.0)
  })
})
