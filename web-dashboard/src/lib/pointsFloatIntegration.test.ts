import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { POINTS_FLOAT, type PointsFloatDetail } from './pointsFloat'

const h = vi.hoisted(() => ({ metricsData: [] as any[], valuesData: [] as any[], failUpsert: false }))
vi.mock('./supabase', () => ({
  sb: {
    from: (table: string) => {
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        in: () => chain,
        order: () => chain,
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
        then: (res: (v: unknown) => unknown) => Promise.resolve({ data: table === 'metrics' ? h.metricsData : h.valuesData, error: null }).then(res),
        upsert: () => Promise.resolve({ error: h.failUpsert ? { message: 'boom' } : null }),
      }
      return chain
    },
  },
}))

const { useDailyMetrics } = await import('./useDailyMetrics')
const { useSets } = await import('./useSets')

let wrapper: ReturnType<typeof mount> | null = null
function setup<T>(use: () => T): T {
  let api!: T
  wrapper = mount(defineComponent({ setup: () => ((api = use()), () => null) }))
  return api
}
function metric(o: Partial<any>): any {
  return { id: 'm1', name: 'M', icon: null, type: 'boolean', unit: null, goal_value: null, goal_direction: null, schedule: null, category_id: null, position: 0, ...o }
}

const floats: number[] = []
const on = (e: Event) => floats.push((e as CustomEvent<PointsFloatDetail>).detail.delta)

beforeEach(() => {
  h.metricsData = []
  h.valuesData = []
  h.failUpsert = false
  floats.length = 0
  window.addEventListener(POINTS_FLOAT, on)
})
afterEach(() => {
  window.removeEventListener(POINTS_FLOAT, on)
  wrapper?.unmount()
  wrapper = null
})

describe('баллы-анимация: Дневные метрики', () => {
  it('отметил boolean → +1, снял → −1', async () => {
    h.metricsData = [metric({ id: 'b1', type: 'boolean' })]
    const dm = setup(useDailyMetrics)
    await dm.load('u1', '2026-10-01')
    await dm.setBoolean(dm.metrics.value[0], true)
    await dm.setBoolean(dm.metrics.value[0], false)
    expect(floats).toEqual([1, -1])
  })

  it('метрика уже была выполнена на загрузке — снятие даёт −1', async () => {
    h.metricsData = [metric({ id: 'b1', type: 'boolean' })]
    h.valuesData = [{ metric_id: 'b1', value: true }]
    const dm = setup(useDailyMetrics)
    await dm.load('u1', '2026-10-01')
    await dm.setBoolean(dm.metrics.value[0], false)
    expect(floats).toEqual([-1])
  })

  it('число: +1 только в момент достижения цели, дальнейшие правки без анимации', async () => {
    h.metricsData = [metric({ id: 'n1', type: 'number', goal_value: 10, goal_direction: 'at_least' })]
    const dm = setup(useDailyMetrics)
    await dm.load('u1', '2026-10-01')
    const m = dm.metrics.value[0]
    await dm.setNumber(m, '4')
    await dm.setNumber(m, '10')
    await dm.setNumber(m, '12')
    await dm.setNumber(m, '3')
    expect(floats).toEqual([1, -1])
  })

  it('режим «прибавлять»: addToNumber набирает до цели → +1 один раз', async () => {
    h.metricsData = [metric({ id: 'n1', type: 'number', goal_value: 10, goal_direction: 'at_least' })]
    const dm = setup(useDailyMetrics)
    await dm.load('u1', '2026-10-01')
    const m = dm.metrics.value[0]
    await dm.addToNumber(m, '6')
    await dm.addToNumber(m, '6')
    await dm.addToNumber(m, '1')
    expect(floats).toEqual([1])
  })

  it('multiselect: первый вариант +1, снятие последнего −1', async () => {
    h.metricsData = [metric({ id: 'ms1', type: 'multiselect', options: [{ key: 'a', label: 'A' }] })]
    const dm = setup(useDailyMetrics)
    await dm.load('u1', '2026-10-01')
    await dm.toggleOpt(dm.metrics.value[0], 'a')
    await dm.toggleOpt(dm.metrics.value[0], 'a')
    expect(floats).toEqual([1, -1])
  })

  it('ошибка записи в БД — анимации нет (не обещаем балл, которого не будет)', async () => {
    h.metricsData = [metric({ id: 'b1', type: 'boolean' })]
    const dm = setup(useDailyMetrics)
    await dm.load('u1', '2026-10-01')
    h.failUpsert = true
    await dm.setBoolean(dm.metrics.value[0], true)
    expect(floats).toEqual([])
  })
})

describe('баллы-анимация: Подходы', () => {
  it('подходы дошли до цели → +1, убрали подход → −1, промежуточные — без анимации', async () => {
    h.metricsData = [metric({ id: 's1', type: 'sets', goal_value: 20, goal_direction: 'at_least' })]
    const s = setup(useSets)
    await s.load('u1', '2026-10-01')
    await flushPromises()
    const m = s.metrics.value[0]
    await s.saveSets(m, [{ reps: 5, variation: null, time: null }])
    await s.saveSets(m, [{ reps: 5, variation: null, time: null }, { reps: 15, variation: null, time: null }])
    await s.saveSets(m, [{ reps: 5, variation: null, time: null }])
    expect(floats).toEqual([1, -1])
  })

  it('ошибка записи — без анимации', async () => {
    h.metricsData = [metric({ id: 's1', type: 'sets', goal_value: 5, goal_direction: 'at_least' })]
    const s = setup(useSets)
    await s.load('u1', '2026-10-01')
    h.failUpsert = true
    await s.saveSets(s.metrics.value[0], [{ reps: 9, variation: null, time: null }])
    expect(floats).toEqual([])
  })
})
