import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POINTS_FLOAT, type PointsFloatDetail } from './pointsFloat'

// Анимация «+1 / −1 с монетой» у воды (BACKLOG 14, 11:11) + эффективная норма (migrations/033): балл — когда набрана норма
// (ручная → авто по весу → 1800), а не при любом значении.
const h = vi.hoisted(() => ({ metric: null as any, weight: null as number | null, current: 0 }))
vi.mock('./supabase', () => ({
  sb: {
    from: (table: string) => {
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        order: () => chain,
        limit: () => chain,
        maybeSingle: () => Promise.resolve({ data: table === 'daily_values' ? { value: h.current } : null, error: null }),
        upsert: () => Promise.resolve({ error: null }),
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => {
          const data =
            table === 'metrics' ? [h.metric]
            : table === 'body_parameters' ? (h.weight == null ? [] : [{ id: 'p1', name: 'Вес', icon: 'svg:scale', position: 0 }])
            : table === 'body_parameter_values' ? (h.weight == null ? [] : [{ value: h.weight }])
            : []
          return Promise.resolve({ data, error: null }).then(res, rej)
        },
      }
      return chain
    },
  },
}))

import { useWater } from './useWater'

const waterMetric = (goal: number | null): any => ({ id: 'w1', user_id: 'u', name: 'Вода', icon: 'svg:droplet', type: 'number', unit: 'мл', goal_value: goal, goal_direction: null, schedule: null, category_id: null, position: 1 })

const events: number[] = []
const onFloat = (e: Event) => events.push((e as CustomEvent<PointsFloatDetail>).detail.delta)

async function addWater(goal: number | null, weight: number | null, current: number, delta: number) {
  h.metric = waterMetric(goal)
  h.weight = weight
  h.current = current
  const w = useWater()
  await w.init('u')
  events.length = 0
  const next = await w.addMl(delta, '2026-10-01')
  return { next, events: [...events] }
}

beforeEach(() => window.addEventListener(POINTS_FLOAT, onFloat))
afterEach(() => window.removeEventListener(POINTS_FLOAT, onFloat))

describe('useWater.addMl → анимация баллов', () => {
  it('авто-норма по весу 80 кг = 2080: 100 мл баллов не даёт (раньше показывало бы «+1»)', async () => {
    expect((await addWater(null, 80, 0, 100)).events).toEqual([])
  })
  it('авто-норма: пересечение 2080 вверх даёт «+1», дальше — тишина, снизу обратно — «−1»', async () => {
    expect((await addWater(null, 80, 2000, 200)).events).toEqual([1])
    expect((await addWater(null, 80, 2500, 100)).events).toEqual([])
    expect((await addWater(null, 80, 2200, -200)).events).toEqual([-1])
  })
  it('веса нет — норма 1800: 1700 + 100 → «+1»', async () => {
    expect((await addWater(null, null, 1700, 100)).events).toEqual([1])
    expect((await addWater(null, null, 100, 100)).events).toEqual([])
  })
  it('ручная норма главнее авто-нормы: 1500 при весе 80 кг', async () => {
    expect((await addWater(1500, 80, 1400, 200)).events).toEqual([1])
  })
  it('неудачная запись (addMl вернул null) — анимации нет', async () => {
    h.metric = null // нет метрики воды: addMl сразу возвращает null
    const w = useWater()
    events.length = 0
    expect(await w.addMl(500, '2026-10-01')).toBeNull()
    expect(events).toEqual([])
  })
})
