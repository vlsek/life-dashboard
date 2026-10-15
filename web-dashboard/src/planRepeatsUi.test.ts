import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { addDaysIso, mondayOf, todayStr, weekdayOf } from './lib/date'

// BACKLOG 1054, срез 1: повторяющиеся пункты «Планов» (миграция 087) — блок «Повторяющиеся на сегодня» и окно добавления.
const h = vi.hoisted(() => ({
  repeats: [] as Record<string, unknown>[],
  repeatsError: null as null | { message: string },
  notes: [] as { date: string; planned_goals: unknown }[],
  upserts: [] as Record<string, unknown>[],
  inserts: [] as Record<string, unknown>[],
  deletes: [] as string[],
}))
vi.mock('./lib/supabase', () => ({
  sb: {
    from: (table: string) => {
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        order: () => chain,
        gte: () => chain,
        lte: () => chain,
        lt: () => chain,
        limit: () => chain,
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
        then: (res: (v: unknown) => unknown) => {
          if (table === 'plan_repeats') return Promise.resolve(h.repeatsError ? { data: null, error: h.repeatsError } : { data: h.repeats, error: null }).then(res)
          if (table === 'daily_notes') return Promise.resolve({ data: h.notes, error: null }).then(res)
          return Promise.resolve({ data: [], error: null }).then(res)
        },
        upsert: (p: Record<string, unknown>) => (h.upserts.push(p), Promise.resolve({ error: null })),
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        delete: () => ({ eq: (_k: string, id: string) => (h.deletes.push(id), Promise.resolve({ error: null })) }),
        insert: (p: Record<string, unknown>) => {
          h.inserts.push(p)
          return { select: () => ({ single: () => Promise.resolve({ data: { id: 'new-1', text: p.text, time: p.time ?? null, schedule: p.schedule }, error: null }) }) }
        },
      }
      return chain
    },
  },
}))

import PlannedSection from './components/PlannedSection.vue'

const TODAY = todayStr()
const otherDay = (weekdayOf(TODAY) + 3) % 7
beforeEach(() => {
  h.repeats = [
    { id: 'r-daily', text: 'Зарядка', time: '07:30', schedule: null },
    { id: 'r-today', text: 'Йога по моим дням', time: null, schedule: { type: 'days', days: [weekdayOf(TODAY)] } },
    { id: 'r-other', text: 'Не сегодня', time: null, schedule: { type: 'days', days: [otherDay] } },
  ]
  h.repeatsError = null
  h.notes = []
  h.upserts = []
  h.inserts = []
  h.deletes = []
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
})
const mountPlanned = async (date?: string) => {
  const w = mount(PlannedSection, { props: { userId: 'u1', date }, attachTo: document.body })
  await flushPromises()
  return w
}
const dueTexts = (w: ReturnType<typeof mount>) => w.findAll('[data-test="repeat-due-item"]').map((r) => r.text())

describe('«Планы»: повторяющиеся на сегодня', () => {
  it('сегодня: «каждый день» и «по моим дням» есть, «не сегодня» — нет', async () => {
    const w = await mountPlanned()
    expect(dueTexts(w)).toEqual(['Зарядка07:30', 'Йога по моим дням'])
    w.unmount()
  })
  it('отметка ставит в план обычный выполненный пункт с repeat и убирает строку из блока', async () => {
    const w = await mountPlanned()
    await w.find('[data-test="repeat-due-check"]').setValue(true)
    await flushPromises()
    expect(h.upserts.at(-1)).toMatchObject({ planned_goals: [{ type: 'custom', text: 'Зарядка', done: true, repeat: 'r-daily', time: '07:30' }] })
    expect(dueTexts(w)).toEqual(['Йога по моим дням'])
    w.unmount()
  })
  it('другой день (не сегодня) блока нет', async () => {
    const w = await mountPlanned(addDaysIso(TODAY, -3))
    expect(w.find('[data-test="repeat-due"]').exists()).toBe(false)
    w.unmount()
  })
  it('«N раз в неделю»: предлагается, пока за неделю отмечено меньше N; набрал N — пропадает', async () => {
    h.repeats = [{ id: 'r-w', text: 'Бег', time: null, schedule: { type: 'weekly', min: 2 } }]
    const monday = mondayOf(TODAY)
    const doneNote = (date: string) => ({ date, planned_goals: [{ type: 'custom', text: 'Бег', done: true, repeat: 'r-w' }] })
    // два дня этой недели, не равных сегодняшнему (в сегодняшний день отметки берутся из плана, а не из заметок) — тест не зависит от дня запуска
    const [d1, d2] = [0, 1, 2, 3].map((i) => addDaysIso(monday, i)).filter((d) => d !== TODAY)
    h.notes = [doneNote(d1)]
    const w1 = await mountPlanned()
    expect(dueTexts(w1)).toEqual(['Бег']) // 1 из 2
    w1.unmount()
    h.notes = [doneNote(d1), doneNote(d2)]
    const w2 = await mountPlanned()
    expect(dueTexts(w2)).toEqual([]) // 2 из 2
    w2.unmount()
  })
  it('нет таблицы (миграция 087 не применена): блока и кнопки нет, «Планы» работают', async () => {
    h.repeatsError = { message: 'relation "plan_repeats" does not exist' }
    const w = await mountPlanned()
    expect(w.find('[data-test="repeat-due"]').exists()).toBe(false)
    expect(w.find('[data-test="repeats-open"]').exists()).toBe(false)
    expect(w.find('[data-test="add-row"]').exists()).toBe(true)
    w.unmount()
  })
})

describe('окно «Повторяющиеся пункты»', () => {
  const open = async () => {
    const w = await mountPlanned()
    await w.find('[data-test="repeats-open"]').trigger('click')
    await flushPromises()
    return w
  }
  const modal = () => document.body.querySelector('[data-test="repeats-modal"]') as HTMLElement
  const q = <T extends HTMLElement>(s: string) => modal().querySelector(s) as T
  const type = async (el: HTMLInputElement | HTMLSelectElement, v: string, ev = 'input') => {
    el.value = v
    el.dispatchEvent(new Event(ev))
    await flushPromises()
  }

  it('список показывает подписи расписания; удаление пишет в базу', async () => {
    const w = await open()
    const sums = [...modal().querySelectorAll('[data-test="repeat-summary"]')].map((e) => e.textContent)
    expect(sums[0]).toBe('каждый день')
    expect(modal().querySelectorAll('[data-test="repeat-item"]')).toHaveLength(3)
    ;(q('[data-test="repeat-delete"]') as HTMLElement).click()
    await flushPromises()
    expect(h.deletes).toEqual(['r-daily'])
    expect(modal().querySelectorAll('[data-test="repeat-item"]')).toHaveLength(2)
    w.unmount()
  })
  it('добавление «3 раза в неделю» со временем пишет расписание weekly', async () => {
    const w = await open()
    await type(q('[data-test="repeat-text"]'), '  Плавание  ')
    await type(q('[data-test="repeat-kind"]'), 'weekly', 'change')
    await type(q('[data-test="repeat-times"]'), '3')
    await type(q('[data-test="repeat-time"]'), '19:00')
    ;(q('[data-test="repeat-add"]') as HTMLElement).click()
    await flushPromises()
    expect(h.inserts.at(-1)).toMatchObject({ user_id: 'u1', text: 'Плавание', time: '19:00', schedule: { type: 'weekly', min: 3 } })
    expect(modal().querySelectorAll('[data-test="repeat-item"]')).toHaveLength(4)
    w.unmount()
  })
  it('«по дням»: выбранные дни пишутся отсортированными; без дней и без названия — ошибка, записи нет', async () => {
    const w = await open()
    ;(q('[data-test="repeat-add"]') as HTMLElement).click()
    await flushPromises()
    expect(q('[data-test="repeat-error"]').textContent).toContain('название')
    expect(h.inserts).toHaveLength(0)
    await type(q('[data-test="repeat-text"]'), 'Растяжка')
    await type(q('[data-test="repeat-kind"]'), 'days', 'change')
    for (const d of [1, 3, 5]) (q(`[data-test="repeat-day-${d}"]`) as HTMLInputElement).click() // по умолчанию Пн Ср Пт отмечены — снимаем
    await flushPromises()
    ;(q('[data-test="repeat-add"]') as HTMLElement).click()
    await flushPromises()
    expect(q('[data-test="repeat-error"]').textContent).toContain('день')
    expect(h.inserts).toHaveLength(0)
    ;(q('[data-test="repeat-day-6"]') as HTMLInputElement).click()
    ;(q('[data-test="repeat-day-2"]') as HTMLInputElement).click()
    await flushPromises()
    ;(q('[data-test="repeat-add"]') as HTMLElement).click()
    await flushPromises()
    expect(h.inserts.at(-1)).toMatchObject({ text: 'Растяжка', schedule: { type: 'days', days: [2, 6] } })
    w.unmount()
  })
})
