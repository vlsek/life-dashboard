import { beforeEach, describe, expect, it, vi } from 'vitest'

// loadMetricLinks: колонка плана подходов (041) необязательна — нет её, связь с метриками (054) всё равно работает, просто без кольца.
const h = vi.hoisted(() => ({ selects: [] as string[], failOn: [] as string[], allFail: false }))
vi.mock('./lib/supabase', () => ({
  sb: {
    from: () => {
      let cols = ''
      const chain: Record<string, unknown> = {
        select: (c: string) => ((cols = c), h.selects.push(c), chain),
        eq: () => chain,
        order: () =>
          Promise.resolve(
            h.allFail || h.failOn.some((f) => cols.includes(f))
              ? { data: null, error: { code: '42703', message: 'column does not exist' } }
              : { data: [{ id: 'm1', name: 'A', icon: null, type: 'sets', goal_value: null, source_exercise_id: 'e1', position: 1 }], error: null },
          ),
      }
      return chain
    },
  },
}))

import { loadMetricLinks } from './lib/metricLink'

beforeEach(() => {
  h.selects = []
  h.failOn = []
  h.allFail = false
})

describe('loadMetricLinks', () => {
  it('сначала просит план подходов вместе со связью', async () => {
    const r = await loadMetricLinks('u')
    expect(r.supported).toBe(true)
    expect(h.selects).toHaveLength(1)
    expect(h.selects[0]).toContain('planned_sets_log')
  })
  it('нет колонки плана — повторяет запрос без неё, связь поддерживается', async () => {
    h.failOn = ['planned_sets_log']
    const r = await loadMetricLinks('u')
    expect(r.supported).toBe(true)
    expect(r.metrics).toHaveLength(1)
    expect(h.selects).toHaveLength(2)
    expect(h.selects[1]).not.toContain('planned_sets_log')
  })
  it('нет и связи (054) — не поддерживается, раздел как раньше', async () => {
    h.allFail = true
    expect(await loadMetricLinks('u')).toEqual({ supported: false, metrics: [] })
  })
})
