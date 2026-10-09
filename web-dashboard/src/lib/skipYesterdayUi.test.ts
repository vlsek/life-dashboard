import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

// Окно «вчерашние невыполненные» на странице (BACKLOG 47.3, миграция 061): показ раз в день, выключатель, нет миграции, пропуск и оставить, ошибка базы.
const h = vi.hoisted(() => ({
  metrics: [] as Record<string, unknown>[],
  values: [] as Record<string, unknown>[],
  updates: [] as { values: Record<string, unknown>; id: unknown }[],
  updateError: null as null | { message: string },
}))
vi.mock('./supabase', () => ({
  sb: {
    from: (table: string) => {
      let op: 'select' | 'update' = 'select'
      let vals: Record<string, unknown> = {}
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: (_c: string, v: unknown) => {
          if (op === 'update') {
            h.updates.push({ values: vals, id: v })
            return Promise.resolve({ error: h.updateError })
          }
          return chain
        },
        gte: () => chain,
        lte: () => chain,
        order: () => chain,
        update: (v: Record<string, unknown>) => {
          op = 'update'
          vals = v
          return chain
        },
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve({ data: table === 'metrics' ? h.metrics : h.values, error: null }).then(res, rej),
      }
      return chain
    },
  },
}))
vi.mock('./waterGoal', () => ({ withWaterGoal: async (_u: string, m: unknown) => m }))
vi.mock('./waterTracking', () => ({ dropWaterIfOff: (m: unknown) => m, ensureTrackWater: async () => true }))

import SkipYesterdayModal from '../components/SkipYesterdayModal.vue'
import { useSkipYesterday } from './useSkipYesterday'
import { SKIP_OFF_KEY, SKIP_SHOWN_KEY } from './skipYesterday'
import { DATA_CHANGED } from './events'
import { addDays, fmtDate, todayStr } from './date'

const yStr = () => fmtDate(addDays(new Date(), -1))
const dStr = (offset: number) => fmtDate(addDays(new Date(), offset))
const metric = (id: string, over: Record<string, unknown> = {}) => ({ id, user_id: 'u1', name: 'Метрика ' + id, icon: null, type: 'boolean', unit: null, goal_value: null, goal_direction: null, schedule: null, category_id: null, position: 0, active: true, skipped_days: [], ...over })

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  h.updates = []
  h.updateError = null
  h.metrics = [metric('a'), metric('b')]
  // a: серия шла (позавчера и раньше выполнено), вчера нет; b: серии нет, вчера не выполнено
  h.values = [
    { metric_id: 'a', date: dStr(-2), value: true },
    { metric_id: 'a', date: dStr(-3), value: true },
  ]
})

describe('useSkipYesterday', () => {
  it('показывает окно: невыполненные вчера, сначала «могут прервать серию»; метка «показано сегодня» ставится сразу', async () => {
    const s = useSkipYesterday()
    await s.load('u1')
    expect(s.visible.value).toBe(true)
    expect(s.items.value.map((i) => i.metric.id)).toEqual(['a', 'b'])
    expect(s.items.value[0].breaksStreak).toBe(true)
    expect(localStorage.getItem(SKIP_SHOWN_KEY)).toBe(todayStr())
  })

  it('раз в день: после показа повторный вход в тот же день окно не возвращает', async () => {
    await useSkipYesterday().load('u1')
    const again = useSkipYesterday()
    await again.load('u1')
    expect(again.visible.value).toBe(false)
  })

  it('выключено в настройках — окна нет, метка не ставится', async () => {
    localStorage.setItem(SKIP_OFF_KEY, '1')
    const s = useSkipYesterday()
    await s.load('u1')
    expect(s.visible.value).toBe(false)
    expect(localStorage.getItem(SKIP_SHOWN_KEY)).toBeNull()
  })

  it('миграция 061 не применена (в метрике нет skipped_days) — окно не показываем', async () => {
    h.metrics = [{ ...metric('a'), skipped_days: undefined }].map((m) => {
      const { skipped_days, ...rest } = m as Record<string, unknown>
      void skipped_days
      return rest
    })
    const s = useSkipYesterday()
    await s.load('u1')
    expect(s.visible.value).toBe(false)
  })

  it('всё выполнено вчера — окна нет', async () => {
    h.values = [{ metric_id: 'a', date: yStr(), value: true }, { metric_id: 'b', date: yStr(), value: true }]
    const s = useSkipYesterday()
    await s.load('u1')
    expect(s.visible.value).toBe(false)
  })

  it('«Пропустить день»: запись skipped_days со вчерашней датой, строка уходит, остальные пересчитываются событием', async () => {
    const s = useSkipYesterday()
    await s.load('u1')
    const events: unknown[] = []
    window.addEventListener(DATA_CHANGED, (e) => events.push((e as CustomEvent).detail))
    await s.skip('a')
    expect(h.updates.at(-1)).toEqual({ values: { skipped_days: [yStr()] }, id: 'a' })
    expect(s.items.value.map((i) => i.metric.id)).toEqual(['b'])
    expect(events.at(-1)).toMatchObject({ source: 'skip', metricId: 'a', date: yStr() })
  })

  it('база отклонила запись — строка остаётся, ошибка показана', async () => {
    h.updateError = { message: 'skip_out_of_window' }
    const s = useSkipYesterday()
    await s.load('u1')
    await s.skip('a')
    expect(s.items.value.map((i) => i.metric.id)).toEqual(['a', 'b'])
    expect(s.error.value).toContain('skip_out_of_window')
  })

  it('«Оставить»: строка уходит без записи; когда список пуст — окно закрывается', async () => {
    const s = useSkipYesterday()
    await s.load('u1')
    s.keep('a')
    expect(h.updates).toHaveLength(0)
    expect(s.visible.value).toBe(true)
    s.keep('b')
    expect(s.visible.value).toBe(false)
  })
})

describe('SkipYesterdayModal', () => {
  const items = [
    { metric: metric('a'), value: undefined, streakBefore: 12, breaksStreak: true },
    { metric: metric('b'), value: undefined, streakBefore: 0, breaksStreak: false },
  ] as never[]

  it('две группы, у серии — число дней; кнопки шлют события', async () => {
    const w = mount(SkipYesterdayModal, { props: { items } })
    expect(w.find('[data-test="skip-group-risky"]').text()).toContain('Могут прервать серию')
    expect(w.find('[data-test="skip-group-plain"]').text()).toContain('Просто не выполнены')
    const rows = w.findAll('[data-test="skip-item"]')
    expect(rows).toHaveLength(2)
    expect(rows[0].find('[data-test="skip-streak"]').text()).toContain('серия 12')
    await rows[0].find('[data-test="skip-btn"]').trigger('click')
    await rows[1].find('[data-test="keep-btn"]').trigger('click')
    await w.find('[data-test="skip-close"]').trigger('click')
    expect(w.emitted('skip')![0]).toEqual(['a'])
    expect(w.emitted('keep')![0]).toEqual(['b'])
    expect(w.emitted('close')).toBeTruthy()
  })

  it('ошибка показывается; пустая группа не рисуется', () => {
    const w = mount(SkipYesterdayModal, { props: { items: [items[1]], error: 'boom' } })
    expect(w.find('[data-test="skip-group-risky"]').exists()).toBe(false)
    expect(w.find('[data-test="skip-error"]').text()).toContain('boom')
  })
})
