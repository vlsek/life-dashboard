import { describe, expect, it } from 'vitest'
import { shouldShowWarmup } from './warmup'

const base = { hasExercises: true, entries: [] as { date: string }[], dismissedOn: null as string | null, today: '2026-09-30' }

describe('shouldShowWarmup', () => {
  it('shows when there are exercises, nothing dismissed and no entries today', () => {
    expect(shouldShowWarmup(base)).toBe(true)
  })
  it('hides with no exercises', () => {
    expect(shouldShowWarmup({ ...base, hasExercises: false })).toBe(false)
  })
  it('hides after dismissal today but returns the next day', () => {
    expect(shouldShowWarmup({ ...base, dismissedOn: '2026-09-30' })).toBe(false)
    expect(shouldShowWarmup({ ...base, dismissedOn: '2026-09-29' })).toBe(true)
  })
  it('hides once the workout has started (entry dated today)', () => {
    expect(shouldShowWarmup({ ...base, entries: [{ date: '2026-09-30' }] })).toBe(false)
    expect(shouldShowWarmup({ ...base, entries: [{ date: '2026-09-29' }] })).toBe(true)
  })
})
