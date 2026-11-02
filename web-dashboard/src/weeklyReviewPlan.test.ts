import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import WeeklyRitual from './components/WeeklyRitual.vue'
import { buildWeeklyReview, saveWeeklyNote } from './lib/weeklyReview'
import { addDaysIso } from './lib/date'
import type { YearGridData } from './lib/yearGrid'
import type { Metric } from './lib/types'

// Итоги недели, срез 2 (BACKLOG 75.6): план, цели и вывод прошлой недели
function metric(o: Partial<Metric> = {}): Metric {
  return { id: 'a', user_id: 'u1', name: 'Зарядка', icon: null, type: 'boolean', unit: null, goal_value: null, goal_direction: null, schedule: null, category_id: null, position: 0, ...o }
}
const SUN = new Date(2026, 10, 1) // вс 2026-11-01 → неделя пн 2026-10-26 … вс 2026-11-01
const WED = new Date(2026, 9, 28) // ср 2026-10-28
const WS = '2026-10-26'
const d = (n: number) => addDaysIso(WS, n)
const goal = (o: Record<string, unknown> = {}) => ({ name: 'Сдать отчёт', stages: 1, done: false, current_stage: 0, done_date: null, ...o })

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
})

describe('buildWeeklyReview: план', () => {
  it('считает выполненные из запланированных за дни недели; бонусные в знаменатель не входят', () => {
    const planned = {
      [d(0)]: [{ type: 'custom', text: 'Врач', done: true }, { type: 'custom', text: 'Хлеб' }, { type: 'custom', text: 'Бонус', bonus: true, done: true }],
      [d(2)]: [{ type: 'custom', text: 'Позвонить', done: true }],
    }
    const r = buildWeeklyReview([], {}, WS, SUN, { planned })!
    expect(r.plan).toEqual({ done: 2, total: 3 })
  })

  it('«выполнено» у пункта-цели — по самой цели; удалённая цель в счёт не идёт', () => {
    const planned = { [d(1)]: [{ type: 'goal', text: 'Сдать отчёт' }, { type: 'goal', text: 'Удалена' }, { type: 'goal', text: 'Выучить темы' }] }
    const goals = [goal({ done: true, done_date: d(1) }), goal({ name: 'Выучить темы', stages: 4, current_stage: 2 })]
    const r = buildWeeklyReview([], {}, WS, SUN, { planned, goals })!
    expect(r.plan).toEqual({ done: 1, total: 2 }) // «Удалена» пропущена, «Выучить темы» ещё не все этапы
  })

  it('дни после сегодняшнего не считаются, прошлые и будущие недели тоже', () => {
    const planned = { [d(0)]: [{ type: 'custom', text: 'Пн', done: true }], [d(5)]: [{ type: 'custom', text: 'Сб' }], [addDaysIso(WS, -1)]: [{ type: 'custom', text: 'Прошлая неделя' }] }
    expect(buildWeeklyReview([], {}, WS, WED, { planned })!.plan).toEqual({ done: 1, total: 1 }) // среда: суббота ещё впереди
    expect(buildWeeklyReview([], {}, WS, SUN, { planned })!.plan).toEqual({ done: 1, total: 2 })
  })

  it('перенесённый на завтра пункт сегодня уже не числится — штрафа нет (его в плане дня нет)', () => {
    const planned = { [d(0)]: [{ type: 'custom', text: 'Остался' }] }
    expect(buildWeeklyReview([], {}, WS, SUN, { planned })!.plan).toEqual({ done: 0, total: 1 })
  })

  it('без плана и без метрик итога нет; пустой план не создаёт строку', () => {
    expect(buildWeeklyReview([], {}, WS, SUN, {})).toBeNull()
    expect(buildWeeklyReview([], {}, WS, SUN, { planned: {} })).toBeNull()
    expect(buildWeeklyReview([], {}, WS, SUN, { planned: { [d(1)]: [{ type: 'custom', text: 'Бонус', bonus: true }] } })).toBeNull()
  })

  it('метрики и план живут вместе, прежние поля не меняются', () => {
    const a = metric()
    const byDay = { [d(0)]: { a: true }, [d(1)]: { a: false } }
    const r = buildWeeklyReview([a], byDay, WS, SUN, { planned: { [d(0)]: [{ type: 'custom', text: 'Х', done: true }] } })!
    expect(r.total).toBe(7)
    expect(r.done).toBe(1)
    expect(r.plan).toEqual({ done: 1, total: 1 })
  })
})

describe('buildWeeklyReview: цели недели', () => {
  it('считает цели, закрытые внутри недели, по done_date', () => {
    const goals = [goal({ done: true, done_date: d(2) }), goal({ name: 'Б', done: true, done_date: d(6) }), goal({ name: 'В', done: true, done_date: addDaysIso(WS, -3) }), goal({ name: 'Г', done: false, done_date: d(1) })]
    expect(buildWeeklyReview([], {}, WS, SUN, { goals })!.goalsClosed).toBe(2) // В — с прошлой недели, Г — не выполнена
  })
  it('день закрытия после сегодняшнего (в среду) не считается; нет закрытых — поля нет', () => {
    const goals = [goal({ done: true, done_date: d(5) })]
    expect(buildWeeklyReview([], {}, WS, WED, { goals })).toBeNull()
    expect(buildWeeklyReview([metric()], { [d(0)]: { a: true } }, WS, WED, { goals })!.goalsClosed).toBeNull()
  })
  it('цель без done_date (старая запись) в итог не попадает — дату не выдумываем', () => {
    expect(buildWeeklyReview([], {}, WS, SUN, { goals: [goal({ done: true })] })).toBeNull()
  })
})

describe('WeeklyRitual.vue: план, цели, вывод прошлой недели', () => {
  const base = (): YearGridData => ({
    metrics: [metric()],
    byDay: { [d(0)]: { a: true }, [d(1)]: { a: true } },
    notes: {},
    today: SUN,
    planned: { [d(0)]: [{ type: 'custom', text: 'Врач', done: true }, { type: 'custom', text: 'Хлеб' }] },
    goals: [goal({ done: true, done_date: d(3) })],
  })

  it('показывает строки плана и закрытых целей', () => {
    const w = mount(WeeklyRitual, { props: { data: base() } })
    expect(w.get('[data-test="wr-plan"]').text()).toBe('План: выполнено 1 из 2 пунктов')
    expect(w.get('[data-test="wr-goals"]').text()).toBe('Закрыто целей: 1')
  })

  it('без плана и целей этих строк нет, прежняя карточка не меняется', () => {
    const data = { ...base(), planned: undefined, goals: undefined }
    const w = mount(WeeklyRitual, { props: { data } })
    expect(w.find('[data-test="wr-plan"]').exists()).toBe(false)
    expect(w.find('[data-test="wr-goals"]').exists()).toBe(false)
    expect(w.find('[data-test="wr-done"]').exists()).toBe(true)
  })

  it('неделя только с планом (метрик нет): карточка есть, строки «выполнено по метрикам» нет', () => {
    const data: YearGridData = { ...base(), metrics: [], byDay: {} }
    const w = mount(WeeklyRitual, { props: { data } })
    expect(w.find('[data-test="weekly-ritual"]').exists()).toBe(true)
    expect(w.find('[data-test="wr-done"]').exists()).toBe(false)
    expect(w.find('[data-test="wr-plan"]').exists()).toBe(true)
  })

  it('«Вывод прошлой недели» — заметка, записанная неделей раньше; её нет — строки нет', () => {
    expect(mount(WeeklyRitual, { props: { data: base() } }).find('[data-test="wr-prev"]').exists()).toBe(false)
    saveWeeklyNote(addDaysIso(WS, -7), 'Раньше ложиться')
    const w = mount(WeeklyRitual, { props: { data: base() } })
    expect(w.get('[data-test="wr-prev"]').text()).toBe('Вывод прошлой недели: Раньше ложиться')
  })

  it('заметка ЭТОЙ недели в «вывод прошлой» не попадает', () => {
    saveWeeklyNote(WS, 'Новый вывод')
    expect(mount(WeeklyRitual, { props: { data: base() } }).find('[data-test="wr-prev"]').exists()).toBe(false)
  })
})
