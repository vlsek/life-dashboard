import { describe, it, expect } from 'vitest'
import { pointsPerDaySeries } from './points-series'
import type { Metric } from './types'

function metric(overrides: Partial<Metric>): Metric {
  return {
    id: 'm1',
    user_id: 'u1',
    name: 'M',
    icon: null,
    type: 'boolean',
    unit: null,
    goal_value: null,
    goal_direction: null,
    schedule: null,
    category_id: null,
    position: 0,
    ...overrides,
  }
}

describe('pointsPerDaySeries', () => {
  it('counts done metrics per day, sorted by date', () => {
    const metrics = [metric({ id: 'water', type: 'boolean' }), metric({ id: 'pushups', type: 'number', goal_value: 20 })]
    const values = [
      { date: '2026-06-02', metric_id: 'water', value: true },
      { date: '2026-06-01', metric_id: 'water', value: true },
      { date: '2026-06-01', metric_id: 'pushups', value: 25 },
      { date: '2026-06-02', metric_id: 'pushups', value: 10 }, // not done
    ]
    expect(pointsPerDaySeries(metrics, values)).toEqual([
      { date: '2026-06-01', y: 2 },
      { date: '2026-06-02', y: 1 },
    ])
  })

  it('returns empty for no values', () => {
    expect(pointsPerDaySeries([], [])).toEqual([])
  })
})
