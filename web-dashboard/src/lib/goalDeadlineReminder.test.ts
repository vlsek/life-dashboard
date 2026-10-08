import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import {
  DEADLINE_REMINDER_DISMISS_KEY,
  DEADLINE_REMINDER_OFF_KEY,
  dueTodayGoals,
  isReminderTime,
  shouldShowDeadlineReminder,
} from './goalDeadlineReminder'
import { todayStr } from './date'
import GoalDeadlineBanner from '../components/GoalDeadlineBanner.vue'

// BACKLOG 47.2: плашка «скоро просрочка цели» с 19:00 в день срока (ответ владельца 2026-10-07), без push.
const at = (h: number, m = 0) => new Date(2026, 9, 8, h, m)

describe('время и фильтр', () => {
  it('напоминание с 19:00 локального времени, раньше — нет', () => {
    expect(isReminderTime(at(18, 59))).toBe(false)
    expect(isReminderTime(at(19, 0))).toBe(true)
    expect(isReminderTime(at(23, 59))).toBe(true)
  })
  it('только невыполненные цели со сроком именно сегодня', () => {
    const g = (id: string, deadline: string | null, done = false) => ({ id, name: id, done, deadline })
    const r = dueTodayGoals([g('a', '2026-10-08'), g('b', '2026-10-08', true), g('c', '2026-10-09'), g('d', '2026-10-07'), g('e', null)], '2026-10-08')
    expect(r.map((x) => x.id)).toEqual(['a'])
  })
  it('показ: включено + 19:00 + есть цели + сегодня не закрывали', () => {
    expect(shouldShowDeadlineReminder(at(19), 1, null, '2026-10-08', true)).toBe(true)
    expect(shouldShowDeadlineReminder(at(18), 1, null, '2026-10-08', true)).toBe(false)
    expect(shouldShowDeadlineReminder(at(20), 0, null, '2026-10-08', true)).toBe(false)
    expect(shouldShowDeadlineReminder(at(20), 2, '2026-10-08', '2026-10-08', true)).toBe(false)
    expect(shouldShowDeadlineReminder(at(20), 2, '2026-10-07', '2026-10-08', true)).toBe(true) // вчерашнее закрытие не считается
    expect(shouldShowDeadlineReminder(at(20), 2, null, '2026-10-08', false)).toBe(false) // выключено
  })
})

const h = vi.hoisted(() => ({ rows: [] as any[], error: null as null | { message: string } }))
vi.mock('./supabase', () => ({
  sb: {
    from: () => {
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        then: (res: (v: unknown) => unknown) => Promise.resolve({ data: h.error ? null : h.rows, error: h.error }).then(res),
      }
      return chain
    },
  },
}))
import { useDeadlineReminder } from './useDeadlineReminder'

function setup() {
  let api!: ReturnType<typeof useDeadlineReminder>
  const wrapper = mount(defineComponent({ setup: () => ((api = useDeadlineReminder()), () => null) }))
  return { api, wrapper }
}

describe('useDeadlineReminder', () => {
  beforeEach(() => {
    localStorage.clear()
    h.rows = []
    h.error = null
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] })
    vi.setSystemTime(new Date(`${todayStr()}T20:00:00`))
  })
  afterEach(() => vi.useRealTimers())

  it('вечером при цели со сроком сегодня плашка видна; закрыть — на день; ключ запоминается', async () => {
    h.rows = [{ id: 'g1', name: 'Сдать отчёт', done: false, deadline: todayStr() }]
    const { api, wrapper } = setup()
    await api.load('u1')
    expect(api.visible.value).toBe(true)
    api.dismiss()
    expect(api.visible.value).toBe(false)
    expect(localStorage.getItem(DEADLINE_REMINDER_DISMISS_KEY)).toBe(todayStr())
    wrapper.unmount()
  })
  it('«Не напоминать» выключает и запоминает; выключенное из страницы «Цели» читается при старте', async () => {
    h.rows = [{ id: 'g1', name: 'A', done: false, deadline: todayStr() }]
    const first = setup()
    await first.api.load('u1')
    first.api.disable()
    expect(first.api.visible.value).toBe(false)
    expect(localStorage.getItem(DEADLINE_REMINDER_OFF_KEY)).toBe('1')
    first.wrapper.unmount()
    const second = setup()
    await second.api.load('u1')
    expect(second.api.visible.value).toBe(false)
    second.wrapper.unmount()
  })
  it('до 19:00 плашки нет, а таймер раз в минуту включает её без перезагрузки', async () => {
    vi.setSystemTime(new Date(`${todayStr()}T18:59:30`))
    h.rows = [{ id: 'g1', name: 'A', done: false, deadline: todayStr() }]
    const { api, wrapper } = setup()
    await api.load('u1')
    expect(api.visible.value).toBe(false)
    vi.advanceTimersByTime(60_000)
    expect(api.visible.value).toBe(true)
    wrapper.unmount()
  })
  it('сбой запроса — молча без плашки; нет целей — нет плашки', async () => {
    h.error = { message: 'boom' }
    const { api, wrapper } = setup()
    await api.load('u1')
    expect(api.visible.value).toBe(false)
    h.error = null
    h.rows = []
    await api.load('u1')
    expect(api.visible.value).toBe(false)
    wrapper.unmount()
  })
})

describe('GoalDeadlineBanner', () => {
  const goals = (n: number) => Array.from({ length: n }, (_, i) => ({ id: String(i), name: `Цель ${i + 1}`, done: false, deadline: '2026-10-08' }))
  it('до трёх названий, остальные — «и ещё N»; ссылка в «Цели»', async () => {
    localStorage.setItem('site_lang', 'ru')
    const w = mount(GoalDeadlineBanner, { props: { goals: goals(5) } })
    expect(w.findAll('[data-test="deadline-reminder-goal"]')).toHaveLength(3)
    expect(w.find('[data-test="deadline-reminder-more"]').text()).toBe('и ещё: 2')
    expect(w.find('[data-test="deadline-reminder-link"]').attributes('href')).toBe('/goals/')
    expect(w.find('[data-test="deadline-reminder-more"]').exists()).toBe(true)
    const one = mount(GoalDeadlineBanner, { props: { goals: goals(1) } })
    expect(one.find('[data-test="deadline-reminder-more"]').exists()).toBe(false)
  })
  it('кнопки сообщают dismiss и disable', async () => {
    const w = mount(GoalDeadlineBanner, { props: { goals: goals(1) } })
    await w.find('[data-test="deadline-reminder-dismiss"]').trigger('click')
    await w.find('[data-test="deadline-reminder-disable"]').trigger('click')
    expect(w.emitted('dismiss')).toHaveLength(1)
    expect(w.emitted('disable')).toHaveLength(1)
  })
})
