import { describe, expect, it } from 'vitest'
import { metricCountsInDay, metricExpectedOn } from './metrics'

// Пропуск дня метрики (BACKLOG 47.3, миграция 061) — копия metricExpectedOn в этой странице учитывает metrics.skipped_days.
const m = (over: Record<string, unknown> = {}) => ({ id: 'a', schedule: null, ...over }) as never

describe('metricExpectedOn: пропущенные дни', () => {
  it('пропущенная дата не нужна, остальные — как раньше', () => {
    expect(metricExpectedOn(m({ skipped_days: ['2026-10-07'] }), '2026-10-07')).toBe(false)
    expect(metricExpectedOn(m({ skipped_days: ['2026-10-07'] }), '2026-10-08')).toBe(true)
    expect(metricExpectedOn(m(), '2026-10-07')).toBe(true)
    expect(metricExpectedOn(m({ skipped_days: null }), '2026-10-07')).toBe(true)
  })
  it('в «процент дня» пропущенная входит только если выполнена', () => {
    expect(metricCountsInDay(m({ skipped_days: ['2026-10-07'] }), '2026-10-07', false)).toBe(false)
    expect(metricCountsInDay(m({ skipped_days: ['2026-10-07'] }), '2026-10-07', true)).toBe(true)
  })
})
