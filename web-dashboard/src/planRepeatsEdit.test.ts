import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { addDaysIso, todayStr, weekdayOf } from './lib/date'
import { repeatsScheduledOn, type PlanRepeat } from './lib/planRepeats'
import type { PlannedEntry } from './lib/planned'

// BACKLOG 1054 срез 2: правка существующего повторяющегося пункта и показ расписания на будущих днях.
const R = (id: string, schedule: PlanRepeat['schedule']): PlanRepeat => ({ id, text: 'П ' + id, time: null, schedule })
const done = (repeat: string): PlannedEntry => ({ type: 'custom', text: 'x', done: true, repeat })

describe('repeatsScheduledOn (будущий день по расписанию)', () => {
  // 2026-10-19 — понедельник, 2026-10-21 — среда
  it('«каждый день» и «по дням» — по расписанию; «N раз в неделю» заранее не расписывается', () => {
    const rs = [R('d', null), R('w', { type: 'days', days: [1, 3] }), R('k', { type: 'weekly', min: 3 })]
    expect(repeatsScheduledOn(rs, '2026-10-19', []).map((r) => r.id)).toEqual(['d', 'w']) // пн
    expect(repeatsScheduledOn(rs, '2026-10-20', []).map((r) => r.id)).toEqual(['d']) // вт
    expect(repeatsScheduledOn(rs, '2026-10-21', []).map((r) => r.id)).toEqual(['d', 'w']) // ср
  })
  it('пункт, уже стоящий в плане этого дня (по repeat), второй раз не показывается', () => {
    expect(repeatsScheduledOn([R('d', null)], '2026-10-19', [done('d')])).toEqual([])
  })
})

const h = vi.hoisted(() => ({
  repeats: [] as Record<string, unknown>[],
  updates: [] as { id: string; row: Record<string, unknown> }[],
  updateError: null as null | { message: string },
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
        then: (res: (v: unknown) => unknown) => Promise.resolve({ data: table === 'plan_repeats' ? h.repeats : [], error: null }).then(res),
        upsert: () => Promise.resolve({ error: null }),
        update: (row: Record<string, unknown>) => ({ eq: (_k: string, id: string) => (h.updates.push({ id, row }), Promise.resolve({ error: h.updateError })) }),
        delete: () => ({ eq: (_k: string, id: string) => (h.deletes.push(id), Promise.resolve({ error: null })) }),
        insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
      }
      return chain
    },
  },
}))

import PlannedSection from './components/PlannedSection.vue'

const TODAY = todayStr()
const TOMORROW = addDaysIso(TODAY, 1)
beforeEach(() => {
  h.repeats = [
    { id: 'r1', text: 'Зарядка', time: '07:30', schedule: null },
    { id: 'r2', text: 'Йога', time: null, schedule: { type: 'days', days: [weekdayOf(TOMORROW)] } },
    { id: 'r3', text: 'Бег', time: null, schedule: { type: 'weekly', min: 3 } },
  ]
  h.updates = []
  h.updateError = null
  h.deletes = []
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
})
const mountPlanned = async (date?: string) => {
  const w = mount(PlannedSection, { props: { userId: 'u1', date }, attachTo: document.body })
  await flushPromises()
  return w
}

describe('«Планы»: будущий день', () => {
  it('завтра: список «По расписанию на этот день» — «каждый день» и «по дням» на завтра, без чекбоксов; «N раз в неделю» нет', async () => {
    const w = await mountPlanned(TOMORROW)
    expect(w.find('[data-test="repeat-preview"]').exists()).toBe(true)
    expect(w.findAll('[data-test="repeat-preview-item"]').map((r) => r.text())).toEqual(['Зарядка07:30', 'Йога'])
    expect(w.find('[data-test="repeat-preview"] input').exists()).toBe(false)
    expect(w.find('[data-test="repeat-due"]').exists()).toBe(false) // чекбоксы — только сегодня
    w.unmount()
  })
  it('сегодня и в прошлом блока «по расписанию» нет (сегодня — обычный список с чекбоксами)', async () => {
    for (const d of [TODAY, addDaysIso(TODAY, -2)]) {
      const w = await mountPlanned(d)
      expect(w.find('[data-test="repeat-preview"]').exists()).toBe(false)
      w.unmount()
    }
  })
})

describe('окно «Повторяющиеся пункты»: правка', () => {
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
  const items = () => [...modal().querySelectorAll('[data-test="repeat-item"]')]

  it('✎ переносит пункт в форму (название, время, вид расписания); кнопка становится «Сохранить», появляется «Не менять»', async () => {
    const w = await open()
    ;(items()[1].querySelector('[data-test="repeat-edit"]') as HTMLElement).click() // «Йога» — по дням
    await flushPromises()
    expect(q<HTMLInputElement>('[data-test="repeat-text"]').value).toBe('Йога')
    expect(q<HTMLSelectElement>('[data-test="repeat-kind"]').value).toBe('days')
    expect(q<HTMLInputElement>(`[data-test="repeat-day-${weekdayOf(TOMORROW)}"]`).checked).toBe(true)
    expect(q('[data-test="repeat-add"]').textContent).toContain('Сохранить')
    expect(q('[data-test="repeat-edit-cancel"]')).toBeTruthy()
    expect(q('[data-test="repeat-editing-hint"]')).toBeTruthy()
    expect(items()[1].getAttribute('aria-current')).toBe('true')
    w.unmount()
  })
  it('«Сохранить» пишет UPDATE по id (а не добавляет), список меняется, форма очищается и возвращается режим добавления', async () => {
    const w = await open()
    ;(items()[0].querySelector('[data-test="repeat-edit"]') as HTMLElement).click() // «Зарядка», 07:30, каждый день
    await flushPromises()
    expect(q<HTMLInputElement>('[data-test="repeat-time"]').value).toBe('07:30')
    await type(q('[data-test="repeat-text"]'), '  Зарядка утром  ')
    await type(q('[data-test="repeat-kind"]'), 'weekly', 'change')
    await type(q('[data-test="repeat-times"]'), '4')
    await type(q('[data-test="repeat-time"]'), '')
    ;(q('[data-test="repeat-add"]') as HTMLElement).click()
    await flushPromises()
    expect(h.updates).toEqual([{ id: 'r1', row: { text: 'Зарядка утром', time: null, schedule: { type: 'weekly', min: 4 } } }])
    expect(items()).toHaveLength(3) // новых строк не появилось
    expect(items()[0].textContent).toContain('Зарядка утром')
    expect(items()[0].querySelector('[data-test="repeat-summary"]')!.textContent).toBe('4×/нед.')
    expect(q<HTMLInputElement>('[data-test="repeat-text"]').value).toBe('')
    expect(q('[data-test="repeat-add"]').textContent).toContain('Добавить')
    expect(modal().querySelector('[data-test="repeat-edit-cancel"]')).toBeNull()
    w.unmount()
  })
  it('смена «каждый день» → «по дням»: дни пишутся отсортированными; пустое название и ноль дней не пишутся', async () => {
    const w = await open()
    ;(items()[0].querySelector('[data-test="repeat-edit"]') as HTMLElement).click()
    await flushPromises()
    await type(q('[data-test="repeat-text"]'), '')
    ;(q('[data-test="repeat-add"]') as HTMLElement).click()
    await flushPromises()
    expect(q('[data-test="repeat-error"]').textContent).toContain('название')
    await type(q('[data-test="repeat-text"]'), 'Зарядка')
    await type(q('[data-test="repeat-kind"]'), 'days', 'change')
    for (const d of [1, 3, 5]) (q(`[data-test="repeat-day-${d}"]`) as HTMLInputElement).click()
    await flushPromises()
    ;(q('[data-test="repeat-add"]') as HTMLElement).click()
    await flushPromises()
    expect(q('[data-test="repeat-error"]').textContent).toContain('день')
    expect(h.updates).toHaveLength(0)
    ;(q('[data-test="repeat-day-6"]') as HTMLInputElement).click()
    ;(q('[data-test="repeat-day-0"]') as HTMLInputElement).click()
    await flushPromises()
    ;(q('[data-test="repeat-add"]') as HTMLElement).click()
    await flushPromises()
    expect(h.updates.at(-1)!.row).toMatchObject({ schedule: { type: 'days', days: [0, 6] } })
    w.unmount()
  })
  it('ошибка записи: показана под полями, окно остаётся в режиме правки, в списке прежние значения', async () => {
    h.updateError = { message: 'boom' }
    const w = await open()
    ;(items()[0].querySelector('[data-test="repeat-edit"]') as HTMLElement).click()
    await flushPromises()
    await type(q('[data-test="repeat-text"]'), 'Новое имя')
    ;(q('[data-test="repeat-add"]') as HTMLElement).click()
    await flushPromises()
    expect(q('[data-test="repeat-error"]')).toBeTruthy()
    expect(q('[data-test="repeat-add"]').textContent).toContain('Сохранить') // всё ещё правка
    expect(q<HTMLInputElement>('[data-test="repeat-text"]').value).toBe('Новое имя') // введённое не пропало
    expect(items()[0].textContent).toContain('Зарядка')
    expect(items()[0].textContent).not.toContain('Новое имя')
    w.unmount()
  })
  it('«Не менять» выходит из правки без записи; удаление правимого пункта очищает форму', async () => {
    const w = await open()
    ;(items()[0].querySelector('[data-test="repeat-edit"]') as HTMLElement).click()
    await flushPromises()
    ;(q('[data-test="repeat-edit-cancel"]') as HTMLElement).click()
    await flushPromises()
    expect(h.updates).toHaveLength(0)
    expect(q<HTMLInputElement>('[data-test="repeat-text"]').value).toBe('')
    ;(items()[1].querySelector('[data-test="repeat-edit"]') as HTMLElement).click()
    await flushPromises()
    ;(items()[1].querySelector('[data-test="repeat-delete"]') as HTMLElement).click()
    await flushPromises()
    expect(h.deletes).toEqual(['r2'])
    expect(q<HTMLInputElement>('[data-test="repeat-text"]').value).toBe('')
    expect(modal().querySelector('[data-test="repeat-edit-cancel"]')).toBeNull()
    w.unmount()
  })
})
