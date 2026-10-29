import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import TodayRemaining from './components/TodayRemaining.vue'
import { remainingToday } from './lib/todayRemaining'
import { PLAN_MARK, planSnapshotOf, requestPlanMark, type PlanMarkDetail } from './lib/planBridge'
import type { Metric } from './lib/types'

// «Осталось на сегодня» (BACKLOG 75.2, срез 1): что попадает в список, в каком порядке и как отмечается.
function metric(o: Partial<Metric>): Metric {
  return { id: 'm1', user_id: 'u1', name: 'T', icon: null, type: 'boolean', unit: null, goal_value: null, goal_direction: null, schedule: null, category_id: null, position: 0, ...o }
}
const DAY = '2026-10-29' // четверг

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
})

describe('remainingToday', () => {
  it('оставляет невыполненные, выполненные не показывает', () => {
    const ms = [metric({ id: 'a', name: 'Зарядка' }), metric({ id: 'b', name: 'Чтение' })]
    expect(remainingToday(ms, { a: true, b: false }, DAY).map((r) => r.id)).toEqual(['b'])
  })

  it('метрики «не больше N» (at_most) — лимит, а не дело: в список не попадают', () => {
    const ms = [metric({ id: 'sugar', type: 'number', goal_value: 2, goal_direction: 'at_most' }), metric({ id: 'w', type: 'number', goal_value: 8, goal_direction: 'at_least' })]
    expect(remainingToday(ms, {}, DAY).map((r) => r.id)).toEqual(['w'])
  })

  it('«N раз в неделю», вне расписания и пропущенный день — не в списке', () => {
    const ms = [
      metric({ id: 'weekly', schedule: { type: 'weekly', min: 3 } }),
      metric({ id: 'mon', schedule: { type: 'days', days: [1] } }), // понедельник, а сегодня четверг
      metric({ id: 'skip', skipped_days: [DAY] }),
      metric({ id: 'every' }),
    ]
    expect(remainingToday(ms, {}, DAY).map((r) => r.id)).toEqual(['every'])
  })

  it('порядок: числовые с целью — ближе к закрытию выше, затем булевы в порядке метрик', () => {
    const ms = [
      metric({ id: 'bool1', name: 'Б1' }),
      metric({ id: 'far', type: 'number', goal_value: 10 }),
      metric({ id: 'near', type: 'number', goal_value: 10 }),
      metric({ id: 'bool2', name: 'Б2' }),
    ]
    const rows = remainingToday(ms, { far: 2, near: 9 }, DAY)
    expect(rows.map((r) => r.id)).toEqual(['near', 'far', 'bool1', 'bool2'])
    expect(rows[0].progress).toBeCloseTo(0.9)
  })

  it('число без значения — прогресс 0, значение не выдумывается', () => {
    const [r] = remainingToday([metric({ id: 'w', type: 'number', goal_value: 8, unit: 'ст.' })], {}, DAY)
    expect(r.progress).toBe(0)
    expect(r.value).toBeNull()
    expect(r.unit).toBe('ст.')
  })

  it('булева закрывается одним касанием, числовая — нет', () => {
    const rows = remainingToday([metric({ id: 'b' }), metric({ id: 'n', type: 'number', goal_value: 5 })], {}, DAY)
    expect(rows.find((r) => r.id === 'b')?.oneTap).toBe(true)
    expect(rows.find((r) => r.id === 'n')?.oneTap).toBe(false)
  })
})

describe('TodayRemaining', () => {
  const rows = remainingToday([metric({ id: 'b', name: 'Зарядка' }), metric({ id: 'n', name: 'Вода', type: 'number', goal_value: 8, unit: 'ст.' })], { n: 3 }, DAY)

  it('показывает счётчик, прогресс «3 / 8 ст.» и кнопку отметки только у булевой', () => {
    const w = mount(TodayRemaining, { props: { rows } })
    expect(w.get('[data-test="today-left-count"]').text()).toBe('2')
    expect(w.get('[data-test="today-left-prog"]').text()).toBe('3 / 8 ст.')
    expect(w.findAll('[data-test="today-left-check"]')).toHaveLength(1)
    expect(w.findAll('[data-test="today-left-go"]')).toHaveLength(1)
  })

  it('касание по кружку шлёт done с id, «К полю» — jump', async () => {
    const w = mount(TodayRemaining, { props: { rows } })
    await w.get('[data-test="today-left-check"]').trigger('click')
    await w.get('[data-test="today-left-go"]').trigger('click')
    expect(w.emitted('done')).toEqual([['b']])
    expect(w.emitted('jump')).toEqual([['n']])
  })
})

describe('remainingToday: пункты плана (срез 2)', () => {
  const plan = [
    { index: 0, text: 'Позвонить маме', time: null },
    { index: 1, text: 'Врач', time: '18:30' },
    { index: 2, text: 'Купить хлеб', time: '09:15' },
  ]

  it('пункты со временем идут первыми по времени, без времени — после булевых метрик', () => {
    const ms = [metric({ id: 'b', name: 'Зарядка' }), metric({ id: 'n', type: 'number', goal_value: 10 })]
    const rows = remainingToday(ms, { n: 4 }, DAY, plan)
    expect(rows.map((r) => r.id)).toEqual(['plan:2', 'plan:1', 'n', 'b', 'plan:0'])
  })

  it('пункт плана закрывается одним касанием и несёт позицию и время', () => {
    const [r] = remainingToday([], {}, DAY, [plan[1]])
    expect(r).toMatchObject({ kind: 'plan', oneTap: true, planIndex: 1, time: '18:30', name: 'Врач', progress: null })
  })

  it('без плана результат тот же, что в срезе 1', () => {
    expect(remainingToday([metric({ id: 'b' })], {}, DAY).map((r) => r.id)).toEqual(['b'])
  })
})

describe('planBridge', () => {
  it('снимок плана: только свои невыполненные пункты, индексы из полного плана', () => {
    const snap = planSnapshotOf(DAY, [
      { type: 'goal', text: 'Цель' },
      { type: 'custom', text: 'Готово', done: true },
      { type: 'custom', text: 'Дело', time: '10:00' },
      { text: 'Без типа' },
    ])
    expect(snap).toEqual({ date: DAY, items: [{ index: 2, text: 'Дело', time: '10:00' }, { index: 3, text: 'Без типа', time: null }] })
  })

  it('просьба отметить: handled=true, только если блок «Планы» её принял', () => {
    expect(requestPlanMark(DAY, 0, 'Дело')).toBe(false) // слушателя нет — например, блок скрыт
    const on = (e: Event) => ((e as CustomEvent<PlanMarkDetail>).detail.handled = true)
    window.addEventListener(PLAN_MARK, on)
    expect(requestPlanMark(DAY, 0, 'Дело')).toBe(true)
    window.removeEventListener(PLAN_MARK, on)
  })

  it('TodayRemaining показывает время пункта плана и шлёт done с его id', async () => {
    const w = mount(TodayRemaining, { props: { rows: remainingToday([], {}, DAY, [{ index: 5, text: 'Врач', time: '18:30' }]) } })
    expect(w.get('[data-test="today-left-time"]').text()).toBe('18:30')
    await w.get('[data-test="today-left-check"]').trigger('click')
    expect(w.emitted('done')).toEqual([['plan:5']])
  })
})
