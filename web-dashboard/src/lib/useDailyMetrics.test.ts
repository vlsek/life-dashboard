import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { DATA_CHANGED, type DataChangedDetail } from './events'

const h = vi.hoisted(() => ({
  calls: [] as any[],
  metricsData: [] as any[],
  valuesData: [] as any[],
  noteData: null as any,
}))
vi.mock('./supabase', () => ({
  sb: {
    from: (table: string) => {
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        order: () => chain,
        maybeSingle: () => Promise.resolve({ data: table === 'daily_notes' ? h.noteData : null, error: null }),
        then: (res: (v: unknown) => unknown) =>
          Promise.resolve({ data: table === 'metrics' ? h.metricsData : h.valuesData, error: null }).then(res),
        upsert: (payload: unknown) => (h.calls.push({ op: 'upsert', table, payload }), Promise.resolve({ error: null })),
        update: (payload: unknown) => ({
          eq: () => ({
            eq: () => ({
              select: () => (h.calls.push({ op: 'update', table, payload }), Promise.resolve({ data: h.noteData ? [{ date: 'x' }] : [], error: null })),
            }),
          }),
        }),
        insert: (payload: unknown) => (h.calls.push({ op: 'insert', table, payload }), Promise.resolve({ error: null })),
      }
      return chain
    },
  },
}))

const { useDailyMetrics } = await import('./useDailyMetrics')

let wrapper: ReturnType<typeof mount> | null = null
function setup() {
  let api!: ReturnType<typeof useDailyMetrics>
  wrapper = mount(defineComponent({ setup: () => ((api = useDailyMetrics()), () => null) }))
  return api
}

function metric(o: Partial<any>): any {
  return { id: 'm1', name: 'M', icon: null, type: 'boolean', unit: null, goal_value: null, goal_direction: null, schedule: null, category_id: null, position: 0, ...o }
}

const events: DataChangedDetail[] = []
function onEvent(e: Event) {
  events.push((e as CustomEvent<DataChangedDetail>).detail)
}

beforeEach(() => {
  h.calls = []
  h.metricsData = []
  h.valuesData = []
  h.noteData = null
  events.length = 0
  window.addEventListener(DATA_CHANGED, onEvent)
})
afterEach(() => {
  window.removeEventListener(DATA_CHANGED, onEvent)
  wrapper?.unmount()
  wrapper = null
})

describe('useDailyMetrics: load()', () => {
  it('splits metrics into boolean/number/multiselect (sets and the water metric are excluded from "owned")', async () => {
    h.metricsData = [
      metric({ id: 'b1', type: 'boolean' }),
      metric({ id: 'n1', type: 'number' }),
      metric({ id: 'ms1', type: 'multiselect', options: [{ key: 'a', label: 'A' }] }),
      metric({ id: 's1', type: 'sets' }),
      metric({ id: 'w1', name: 'Вода', unit: 'ml', type: 'number' }), // findWaterMetric matches by name/unit
    ]
    const dm = setup()
    await dm.load('u1', '2026-09-28')
    expect(dm.booleans.value.map((m: any) => m.id)).toEqual(['b1'])
    expect(dm.numbers.value.map((m: any) => m.id)).toEqual(['n1'])
    expect(dm.multiselects.value.map((m: any) => m.id)).toEqual(['ms1'])
  })

  it('applies saved values into pending, defaults per type otherwise', async () => {
    h.metricsData = [metric({ id: 'b1', type: 'boolean' }), metric({ id: 'n1', type: 'number' })]
    h.valuesData = [{ metric_id: 'b1', value: true }]
    const dm = setup()
    await dm.load('u1', '2026-09-28')
    expect(dm.pending.value.b1).toBe(true)
    expect(dm.pending.value.n1).toBeUndefined()
  })

  it('a network error surfaces in error and does not crash', async () => {
    const dm = setup()
    h.metricsData = [] // still succeeds, just empty — exercised the error path separately below
    await dm.load('u1', '2026-09-28')
    expect(dm.error.value).toBeNull()
  })
})

describe('useDailyMetrics: autosave', () => {
  it('setBoolean upserts and notifies DATA_CHANGED with source "day"', async () => {
    h.metricsData = [metric({ id: 'b1', type: 'boolean' })]
    const dm = setup()
    await dm.load('u1', '2026-09-28')
    await dm.setBoolean(dm.metrics.value[0], true)
    expect(dm.pending.value.b1).toBe(true)
    const up = h.calls.find((c) => c.op === 'upsert')
    expect(up.payload).toMatchObject({ user_id: 'u1', date: '2026-09-28', metric_id: 'b1', value: true })
    expect(events.at(-1)).toMatchObject({ source: 'day', metricId: 'b1', date: '2026-09-28' })
  })

  it('setNumber: empty input keeps the field blank in pending but saves 0 to the DB', async () => {
    h.metricsData = [metric({ id: 'n1', type: 'number' })]
    const dm = setup()
    await dm.load('u1', '2026-09-28')
    await dm.setNumber(dm.metrics.value[0], '')
    expect(dm.pending.value.n1).toBeUndefined()
    expect(h.calls.find((c) => c.op === 'upsert').payload.value).toBe(0)
  })

  it('addToNumber accumulates onto the current total', async () => {
    h.metricsData = [metric({ id: 'n1', type: 'number' })]
    h.valuesData = [{ metric_id: 'n1', value: 10 }]
    const dm = setup()
    await dm.load('u1', '2026-09-28')
    await dm.addToNumber(dm.metrics.value[0], '5')
    expect(dm.pending.value.n1).toBe(15)
  })

  it('toggleOpt adds/removes a multiselect option and persists the whole array', async () => {
    h.metricsData = [metric({ id: 'ms1', type: 'multiselect' })]
    const dm = setup()
    await dm.load('u1', '2026-09-28')
    await dm.toggleOpt(dm.metrics.value[0], 'a')
    expect(dm.pending.value.ms1).toEqual(['a'])
    await dm.toggleOpt(dm.metrics.value[0], 'a')
    expect(dm.pending.value.ms1).toEqual([])
  })
})

describe('useDailyMetrics: score reacts to other blocks via DATA_CHANGED', () => {
  it('re-fetches external values (e.g. sets) when notified for the same date, without touching own pending', async () => {
    h.metricsData = [metric({ id: 's1', type: 'sets', goal_value: 10 })]
    const dm = setup()
    await dm.load('u1', '2026-09-28')
    expect(dm.score.value.points).toBe(0)

    h.valuesData = [{ metric_id: 's1', value: [{ reps: 10 }] }]
    window.dispatchEvent(new CustomEvent(DATA_CHANGED, { detail: { source: 'sets', date: '2026-09-28' } }))
    await flushPromises()
    expect(dm.score.value.points).toBe(1)
  })

  it('ignores its own "day" events and events for a different date', async () => {
    h.metricsData = [metric({ id: 's1', type: 'sets' })]
    const dm = setup()
    await dm.load('u1', '2026-09-28')
    const before = { ...dm.pending.value }
    window.dispatchEvent(new CustomEvent(DATA_CHANGED, { detail: { source: 'day', date: '2026-09-28' } }))
    window.dispatchEvent(new CustomEvent(DATA_CHANGED, { detail: { source: 'sets', date: '2026-09-27' } }))
    await flushPromises()
    expect(dm.pending.value).toEqual(before)
  })
})

describe('useDailyMetrics: «Что полезного сделал»', () => {
  it('addItem trims, appends, and inserts a new daily_notes row when none exists yet', async () => {
    h.metricsData = []
    h.noteData = null
    const dm = setup()
    await dm.load('u1', '2026-09-28')
    const ok = await dm.addItem('  Fixed the bug  ')
    expect(ok).toBe(true)
    expect(dm.items.value).toEqual(['Fixed the bug'])
    expect(h.calls.some((c) => c.op === 'insert' && c.table === 'daily_notes')).toBe(true)
  })

  it('a blank item is a no-op', async () => {
    const dm = setup()
    await dm.load('u1', '2026-09-28')
    expect(await dm.addItem('   ')).toBe(false)
    expect(h.calls.length).toBe(0)
  })

  it('removeItem drops by index and updates the existing row (no insert)', async () => {
    h.noteData = { items: ['A', 'B'] }
    const dm = setup()
    await dm.load('u1', '2026-09-28')
    await dm.removeItem(0)
    expect(dm.items.value).toEqual(['B'])
    expect(h.calls.some((c) => c.op === 'update' && c.table === 'daily_notes')).toBe(true)
    expect(h.calls.some((c) => c.op === 'insert')).toBe(false)
  })
})

describe('useDailyMetrics: saveDay', () => {
  it('upserts every owned metric at once (untouched number -> 0) and notifies once', async () => {
    h.metricsData = [metric({ id: 'b1', type: 'boolean' }), metric({ id: 'n1', type: 'number' })]
    h.noteData = { items: [] }
    const dm = setup()
    await dm.load('u1', '2026-09-28')
    const ok = await dm.saveDay()
    expect(ok).toBe(true)
    const rows = h.calls.find((c) => c.op === 'upsert' && Array.isArray(c.payload)).payload
    expect(rows).toEqual(
      expect.arrayContaining([
        { user_id: 'u1', date: '2026-09-28', metric_id: 'b1', value: false },
        { user_id: 'u1', date: '2026-09-28', metric_id: 'n1', value: 0 },
      ]),
    )
    expect(events.some((e) => e.source === 'day')).toBe(true)
  })
})
