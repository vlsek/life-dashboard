import { beforeEach, describe, expect, it, vi } from 'vitest'

// Мок Supabase: каждый запрос считается, данные берутся по имени таблицы.
const h = vi.hoisted(() => ({
  calls: [] as string[],
  params: [] as any[],
  values: [] as any[],
  fail: false,
}))
vi.mock('./supabase', () => ({
  sb: {
    from: (table: string) => {
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        order: () => chain,
        limit: () => chain,
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => {
          h.calls.push(table)
          if (h.fail) return Promise.reject(new Error('network')).then(res, rej)
          return Promise.resolve({ data: table === 'body_parameters' ? h.params : h.values, error: null }).then(res, rej)
        },
      }
      return chain
    },
  },
}))

import {
  applyWaterGoal,
  autoNormFromWeight,
  findWaterNumberMetric,
  isWaterLike,
  isWeightLike,
  loadAutoNormMl,
  resetWaterGoalCache,
  withWaterGoal,
} from './waterGoal'

const metric = (o: Partial<any> = {}): any => ({ id: 'w1', user_id: 'u', name: 'Вода', icon: 'svg:droplet', type: 'number', unit: 'мл', goal_value: null, goal_direction: null, schedule: null, category_id: null, position: 1, ...o })

beforeEach(() => {
  h.calls = []
  h.params = []
  h.values = []
  h.fail = false
  resetWaterGoalCache()
})

describe('isWaterLike / isWeightLike — зеркало SQL is_water_like / is_weight_like (migrations/033)', () => {
  it('вода: svg-капля, эмодзи (в т.ч. с VS16), название в любом регистре', () => {
    expect(isWaterLike('svg:droplet', 'x')).toBe(true)
    expect(isWaterLike('💧', 'x')).toBe(true)
    expect(isWaterLike('💧\uFE0F', 'x')).toBe(true)
    expect(isWaterLike('💦', 'x')).toBe(true)
    expect(isWaterLike(null, 'ВОДА')).toBe(true)
    expect(isWaterLike(null, 'Water')).toBe(true)
    expect(isWaterLike('📌', 'Отжимания')).toBe(false)
    expect(isWaterLike(null, null)).toBe(false)
  })
  it('вес: svg-весы, ⚖ (в т.ч. с VS16), название «вес»/«weight»', () => {
    expect(isWeightLike('svg:scale', 'x')).toBe(true)
    expect(isWeightLike('⚖\uFE0F', null)).toBe(true)
    expect(isWeightLike(null, 'Вес тела')).toBe(true)
    expect(isWeightLike(null, 'Weight')).toBe(true)
    expect(isWeightLike('📏', 'Талия')).toBe(false)
  })
})

describe('autoNormFromWeight', () => {
  it('вес × 30, округление как в SQL numeric (x,5 вверх); нет веса или 0 → null', () => {
    expect(autoNormFromWeight(80)).toBe(2400)
    expect(autoNormFromWeight(65.4)).toBe(1962)
    expect(autoNormFromWeight(70.05)).toBe(2102) // 2101,5 → 2102, а не 2101 из-за float
    expect(autoNormFromWeight(0)).toBeNull()
    expect(autoNormFromWeight(null)).toBeNull()
    expect(autoNormFromWeight(undefined)).toBeNull()
  })
})

describe('findWaterNumberMetric', () => {
  it('берёт первую воду по position, затем по id; не-number игнорируются', () => {
    const list = [
      metric({ id: 'b', position: 2 }),
      metric({ id: 'a', position: 2 }),
      metric({ id: 'bool', type: 'boolean', position: 0 }),
      metric({ id: 'c', position: 5, name: 'Отжимания', icon: '📌' }),
    ]
    expect(findWaterNumberMetric(list)?.id).toBe('a')
    expect(findWaterNumberMetric([metric({ id: 'x', position: 3 }), metric({ id: 'y', position: 1 })])?.id).toBe('y')
    expect(findWaterNumberMetric([metric({ type: 'boolean' })])).toBeUndefined()
  })
})

describe('applyWaterGoal', () => {
  it('пустая норма → авто-норма; без веса → 2000', () => {
    expect(applyWaterGoal([metric()], 2400)[0].goal_value).toBe(2400)
    expect(applyWaterGoal([metric()], null)[0].goal_value).toBe(2000)
  })
  it('заданная норма (даже ручная) главнее — массив возвращается как есть', () => {
    const list = [metric({ goal_value: 1500 })]
    expect(applyWaterGoal(list, 2400)).toBe(list)
  })
  it('нет воды или вода не number — без изменений; не мутирует входные объекты; вторая «вода» не трогается', () => {
    const none = [metric({ name: 'Отжимания', icon: '📌' })]
    expect(applyWaterGoal(none, 2400)).toBe(none)
    const first = metric({ id: 'w1', position: 1 })
    const second = metric({ id: 'w2', position: 2, name: 'Water 2' })
    const out = applyWaterGoal([first, second], 2400)
    expect(out[0].goal_value).toBe(2400)
    expect(out[1].goal_value).toBeNull()
    expect(first.goal_value).toBeNull()
  })
})

describe('loadAutoNormMl / withWaterGoal (сеть)', () => {
  it('норма задана или воды нет — ни одного запроса', async () => {
    const withGoal = [metric({ goal_value: 1500 })]
    expect(await withWaterGoal('u', withGoal)).toBe(withGoal)
    const none = [metric({ name: 'Отжимания', icon: '📌' })]
    expect(await withWaterGoal('u', none)).toBe(none)
    expect(h.calls).toEqual([])
  })
  it('пустая норма: читает параметр веса и его последнее значение → вес × 30', async () => {
    h.params = [{ id: 'p1', name: 'Вес', icon: 'svg:scale', position: 0 }]
    h.values = [{ value: 80 }]
    const out = await withWaterGoal('u', [metric()])
    expect(out[0].goal_value).toBe(2400)
    expect(h.calls).toEqual(['body_parameters', 'body_parameter_values'])
  })
  it('нет параметра веса / вес 0 / ошибка сети → 2000, ошибка не кэшируется', async () => {
    expect((await withWaterGoal('u', [metric()]))[0].goal_value).toBe(2000)
    resetWaterGoalCache()
    h.params = [{ id: 'p1', name: 'Weight', icon: null, position: 0 }]
    h.values = [{ value: 0 }]
    expect((await withWaterGoal('u', [metric()]))[0].goal_value).toBe(2000)
    resetWaterGoalCache()
    h.fail = true
    expect((await withWaterGoal('u', [metric()]))[0].goal_value).toBe(2000)
    h.fail = false
    h.values = [{ value: 70 }]
    expect((await withWaterGoal('u', [metric()]))[0].goal_value).toBe(2100) // не залип на ошибке
  })
  it('кэш: повторные загрузки подряд ходят в сеть один раз; событие изменения данных сбрасывает кэш', async () => {
    h.params = [{ id: 'p1', name: 'Вес', icon: 'svg:scale', position: 0 }]
    h.values = [{ value: 80 }]
    await Promise.all([loadAutoNormMl('u'), loadAutoNormMl('u'), loadAutoNormMl('u')])
    expect(h.calls.filter((c) => c === 'body_parameters').length).toBe(1)
    window.dispatchEvent(new CustomEvent('dashboard:data-changed'))
    await loadAutoNormMl('u')
    expect(h.calls.filter((c) => c === 'body_parameters').length).toBe(2)
    await loadAutoNormMl('other-user') // другой пользователь — отдельный запрос
    expect(h.calls.filter((c) => c === 'body_parameters').length).toBe(3)
  })
})
