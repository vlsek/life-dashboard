import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { DATA_CHANGED } from './events'

// Записывающий мок Supabase: фиксирует, что и с какими фильтрами читали/писали.
const h = vi.hoisted(() => ({
  calls: [] as any[],
  noteData: null as any,
  goalsData: [] as any[],
  windowNotes: [] as any[],
  upsertImpl: null as null | (() => Promise<{ error: { message: string } | null }>),
  goalUpdateError: null as null | { message: string },
}))
vi.mock('./supabase', () => ({
  sb: {
    from: (table: string) => {
      const filters: any[] = []
      const chain: any = {
        select: () => chain,
        eq: (c: string, v: unknown) => (filters.push(['eq', c, v]), chain),
        gte: (c: string, v: unknown) => (filters.push(['gte', c, v]), chain),
        lt: (c: string, v: unknown) => (filters.push(['lt', c, v]), chain),
        maybeSingle: () => Promise.resolve({ data: table === 'daily_notes' ? h.noteData : null, error: null }),
        then: (res: (v: unknown) => unknown) => {
          h.calls.push({ op: 'select', table, filters })
          return Promise.resolve({ data: table === 'goals' ? h.goalsData : h.windowNotes, error: null }).then(res)
        },
        upsert: (payload: unknown, opts: unknown) => {
          h.calls.push({ op: 'upsert', table, payload, opts })
          return h.upsertImpl ? h.upsertImpl() : Promise.resolve({ error: null })
        },
        update: (payload: unknown) => ({
          eq: (c: string, v: unknown) => {
            h.calls.push({ op: 'update', table, payload, where: [c, v] })
            return Promise.resolve({ error: h.goalUpdateError })
          },
        }),
      }
      return chain
    },
  },
}))

import { usePlanned } from './usePlanned'

function setup() {
  let api!: ReturnType<typeof usePlanned>
  const wrapper = mount(defineComponent({ setup: () => ((api = usePlanned()), () => null) }))
  return { api, wrapper }
}
const upserts = () => h.calls.filter((c) => c.op === 'upsert')

describe('usePlanned', () => {
  let events: any[]
  const onEvent = (e: Event) => events.push((e as CustomEvent).detail)
  beforeEach(() => {
    h.calls = []
    h.noteData = { planned_goals: ['Старая цель-строка', { type: 'custom', text: 'A', done: false }] }
    h.goalsData = [{ id: 'g1', name: 'Старая цель-строка', stages: null, done: false, current_stage: null }]
    h.windowNotes = []
    h.upsertImpl = null
    h.goalUpdateError = null
    events = []
    window.addEventListener(DATA_CHANGED, onEvent)
  })
  afterEach(() => window.removeEventListener(DATA_CHANGED, onEvent))

  it('load: нормализует старые записи-строки и читает цели', async () => {
    const { api, wrapper } = setup()
    await api.load('u1', '2026-09-28')
    expect(api.planned.value).toEqual([{ type: 'goal', text: 'Старая цель-строка' }, { type: 'custom', text: 'A', done: false }])
    expect(api.goals.value).toHaveLength(1)
    expect(api.loaded.value).toBe(true)
    wrapper.unmount()
  })

  it('запись: upsert только planned_goals по (user_id, date) + событие для пересчёта колец и стриков', async () => {
    const { api, wrapper } = setup()
    await api.load('u1', '2026-09-28')
    expect(await api.addCustomItem('  Позвонить  ')).toBe(true)
    expect(upserts()).toHaveLength(1)
    expect(upserts()[0]).toMatchObject({ table: 'daily_notes', opts: { onConflict: 'user_id,date' } })
    expect(upserts()[0].payload).toEqual({
      user_id: 'u1',
      date: '2026-09-28',
      planned_goals: [{ type: 'goal', text: 'Старая цель-строка' }, { type: 'custom', text: 'A', done: false }, { type: 'custom', text: 'Позвонить', done: false }],
    })
    expect(events).toEqual([{ source: 'plan', date: '2026-09-28' }])
    wrapper.unmount()
  })

  it('план показывается сразу (оптимистично), до ответа сервера', async () => {
    const { api, wrapper } = setup()
    await api.load('u1', '2026-09-28')
    let release!: () => void
    h.upsertImpl = () => new Promise((r) => (release = () => r({ error: null })))
    const p = api.toggleItemBonus(1)
    expect(api.planned.value[1].bonus).toBe(true) // ещё не сохранено, но уже видно
    await flushPromises()
    release()
    await p
    wrapper.unmount()
  })

  it('быстрые правки пишутся в базу строго по очереди', async () => {
    const { api, wrapper } = setup()
    await api.load('u1', '2026-09-28')
    const order: string[] = []
    const releases: Array<() => void> = []
    h.upsertImpl = () => {
      const n = upserts().length
      order.push(`start${n}`)
      return new Promise((r) => releases.push(() => (order.push(`end${n}`), r({ error: null }))))
    }
    const p1 = api.addCustomItem('Первый')
    const p2 = api.addCustomItem('Второй')
    await flushPromises()
    expect(upserts()).toHaveLength(1) // вторая запись ждёт первую
    releases[0]()
    await flushPromises()
    expect(upserts()).toHaveLength(2)
    releases[1]()
    await Promise.all([p1, p2])
    expect(order).toEqual(['start1', 'end1', 'start2', 'end2'])
    // вторая запись уже содержит оба новых пункта (она строилась поверх оптимистичного состояния)
    expect(upserts()[1].payload.planned_goals.map((p: any) => p.text)).toEqual(['Старая цель-строка', 'A', 'Первый', 'Второй'])
    wrapper.unmount()
  })

  it('ошибка записи: откат, текст ошибки, события нет', async () => {
    const { api, wrapper } = setup()
    await api.load('u1', '2026-09-28')
    h.upsertImpl = () => Promise.resolve({ error: { message: 'boom' } })
    expect(await api.removeItem(0)).toBe(false)
    expect(api.planned.value).toHaveLength(2)
    expect(api.error.value).toBeTruthy() // понятный текст, без сырого «boom»
    expect(api.error.value).not.toContain('boom')
    expect(events).toEqual([])
    wrapper.unmount()
  })

  it('откат при ошибке идёт к последнему ПОДТВЕРЖДЁННОМУ состоянию, а не к неудавшемуся оптимистичному', async () => {
    const { api, wrapper } = setup()
    await api.load('u1', '2026-09-28')
    h.upsertImpl = () => Promise.resolve({ error: { message: 'down' } })
    const p1 = api.addCustomItem('Первый')
    const p2 = api.addCustomItem('Второй') // строится поверх оптимистичного «Первый»
    expect(await Promise.all([p1, p2])).toEqual([false, false])
    expect(api.planned.value.map((p) => p.text)).toEqual(['Старая цель-строка', 'A']) // ни «Первый», ни «Второй»
    wrapper.unmount()
  })

  it('успех после сбоя: подтверждённое состояние обновляется, следующий откат идёт уже к нему', async () => {
    const { api, wrapper } = setup()
    await api.load('u1', '2026-09-28')
    await api.addCustomItem('Сохранён')
    h.upsertImpl = () => Promise.resolve({ error: { message: 'down' } })
    await api.addCustomItem('Не сохранён')
    expect(api.planned.value.map((p) => p.text)).toEqual(['Старая цель-строка', 'A', 'Сохранён'])
    wrapper.unmount()
  })

  it('setGoalDone: пишет done и дату выполнения в саму цель; снятие галочки обнуляет дату', async () => {
    const { api, wrapper } = setup()
    await api.load('u1', '2026-09-28')
    const g = api.goals.value[0]
    await api.setGoalDone(g, true, '2026-09-28')
    expect(h.calls.find((c) => c.op === 'update')).toMatchObject({ table: 'goals', payload: { done: true, done_date: '2026-09-28' }, where: ['id', 'g1'] })
    expect(api.goals.value[0].done).toBe(true)
    await api.setGoalDone(api.goals.value[0], false, '2026-09-28')
    expect(h.calls.filter((c) => c.op === 'update')[1].payload).toEqual({ done: false, done_date: null })
    expect(events).toHaveLength(2)
    wrapper.unmount()
  })

  it('setGoalDone: ошибка — галочка откатывается', async () => {
    const { api, wrapper } = setup()
    await api.load('u1', '2026-09-28')
    h.goalUpdateError = { message: 'nope' }
    expect(await api.setGoalDone(api.goals.value[0], true, '2026-09-28')).toBe(false)
    expect(api.goals.value[0].done).toBe(false)
    expect(api.error.value).toBeTruthy()
    expect(api.error.value).not.toContain('nope')
    wrapper.unmount()
  })

  it('перенос: читается только окно 7 суток до этой даты (а не вся таблица заметок)', async () => {
    const { api, wrapper } = setup()
    await api.load('u1', '2026-09-28')
    h.windowNotes = [{ date: '2026-09-27', planned_goals: [{ type: 'custom', text: 'Купить хлеб', done: false }, { type: 'custom', text: 'A', done: false }] }]
    const found = await api.loadCarryOver()
    const q = h.calls.filter((c) => c.op === 'select' && c.table === 'daily_notes').at(-1)!
    expect(q.filters).toEqual([['eq', 'user_id', 'u1'], ['gte', 'date', '2026-09-21'], ['lt', 'date', '2026-09-28']])
    expect(found).toEqual([{ text: 'Купить хлеб', date: '2026-09-27' }]) // «A» уже в сегодняшнем плане
    wrapper.unmount()
  })

  it('carryOver добавляет выбранное одним обновлением плана', async () => {
    const { api, wrapper } = setup()
    await api.load('u1', '2026-09-28')
    await api.carryOver(['X', 'Y'])
    expect(upserts()).toHaveLength(1)
    expect(upserts()[0].payload.planned_goals.slice(-2)).toEqual([{ type: 'custom', text: 'X', done: false }, { type: 'custom', text: 'Y', done: false }])
    wrapper.unmount()
  })
})
