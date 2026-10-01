import { beforeEach, describe, expect, it, vi } from 'vitest'

type Row = Record<string, unknown>
const h = vi.hoisted(() => ({
  tables: {} as Record<string, Row[]>,
  failDailyValues: false,
  calls: [] as { table: string; method: string; args: unknown[] }[],
}))

vi.mock('./supabase', () => {
  function builder(table: string) {
    const b: Record<string, unknown> = {}
    const result = () => {
      if (table === 'daily_values' && h.failDailyValues) return { data: null, error: { message: 'boom' } }
      return { data: h.tables[table] ?? [], error: null }
    }
    for (const m of ['select', 'eq', 'in', 'gte', 'order', 'range']) {
      b[m] = (...args: unknown[]) => {
        h.calls.push({ table, method: m, args })
        return b
      }
    }
    b.maybeSingle = async () => ({ data: (h.tables[table] ?? [])[0] ?? null, error: null })
    b.then = (resolve: (v: unknown) => unknown) => resolve(result())
    return b
  }
  return {
    sb: {
      auth: { getSession: async () => ({ data: { session: { user: { id: 'u1', email: 'a@b' } } } }) },
      from: (table: string) => builder(table),
    },
  }
})

import { flushPromises } from '@vue/test-utils'
import { useChallenges } from './useChallenges'

const instance = (over: Row = {}): Row => ({
  id: 'c1', user_id: 'u1', template_id: null, title: 'Отжимания', icon: '💪', type: 'daily_fixed', unit: 'раз', start_date: '2026-09-01',
  duration_days: 30, daily_target: 100, start_value: null, daily_increment: null, target_count: null, item_label: null,
  active: true, completed: false, completed_at: null, created_at: '2026-09-01T00:00:00Z', ...over,
})

async function setup() {
  const c = useChallenges()
  await c.init()
  await flushPromises()
  return c
}

describe('useChallenges — значения из метрики', () => {
  beforeEach(() => {
    h.calls.length = 0
    h.failDailyValues = false
    h.tables = {
      profiles: [{ onboarded: true }],
      challenge_entries: [{ id: 'e1', user_id: 'u1', challenge_id: 'c1', date: '2026-09-02', value: 5, note: null, created_at: '' }],
      metrics: [
        { id: 'm1', name: 'Отжимания', icon: '💪', type: 'sets', unit: 'раз', active: true },
        { id: 'm9', name: 'Старая', icon: null, type: 'number', unit: null, active: false },
        { id: 'm5', name: 'Теги', icon: null, type: 'multiselect', unit: null, active: true },
      ],
      daily_values: [
        { metric_id: 'm1', date: '2026-09-01', value: [{ reps: 60 }, { reps: 40 }] },
        { metric_id: 'm1', date: '2026-09-02', value: [{ reps: 100 }] },
        { metric_id: 'm1', date: '2026-09-03', value: null },
      ],
    }
  })

  it('merges metric values into the entries; manual entry wins; sets are summed', async () => {
    h.tables.challenge_instances = [instance({ source_metric_id: 'm1' })]
    const c = await setup()
    const ch = c.instances.value[0]
    const byDate = Object.fromEntries(c.effectiveEntries(ch).map((e) => [e.date, e.value]))
    expect(byDate).toEqual({ '2026-09-02': 5, '2026-09-01': 100 })
    expect(c.sourceMetricName(ch)).toBe('Отжимания')
  })

  it('offers only active number/sets/boolean metrics as sources', async () => {
    h.tables.challenge_instances = [instance({ source_metric_id: 'm1' })]
    const c = await setup()
    expect(c.metrics.value.map((m) => m.id)).toEqual(['m1'])
  })

  it('does not even query daily_values when no challenge has a source (also the state before migration 032)', async () => {
    h.tables.challenge_instances = [instance()]
    const c = await setup()
    expect(h.calls.some((x) => x.table === 'daily_values')).toBe(false)
    expect(c.effectiveEntries(c.instances.value[0]).map((e) => e.date)).toEqual(['2026-09-02'])
  })

  it('a failing daily_values query leaves manual entries intact and does not break the page', async () => {
    h.tables.challenge_instances = [instance({ source_metric_id: 'm1' })]
    h.failDailyValues = true
    const c = await setup()
    expect(c.error.value).toBeNull()
    expect(c.effectiveEntries(c.instances.value[0]).map((e) => e.date)).toEqual(['2026-09-02'])
  })
})
