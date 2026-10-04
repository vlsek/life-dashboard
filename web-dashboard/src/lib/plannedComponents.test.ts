import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { t } from './i18n'
import { todayStr } from './date'

const h = vi.hoisted(() => ({
  calls: [] as any[],
  noteData: null as any,
  goalsData: [] as any[],
  windowNotes: [] as any[],
}))
vi.mock('./supabase', () => ({
  sb: {
    from: (table: string) => {
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        gte: () => chain,
        lt: () => chain,
        maybeSingle: () => Promise.resolve({ data: table === 'daily_notes' ? h.noteData : null, error: null }),
        then: (res: (v: unknown) => unknown) => Promise.resolve({ data: table === 'goals' ? h.goalsData : h.windowNotes, error: null }).then(res),
        upsert: (payload: unknown) => (h.calls.push({ op: 'upsert', table, payload }), Promise.resolve({ error: null })),
        update: (payload: unknown) => ({ eq: (c: string, v: unknown) => (h.calls.push({ op: 'update', table, payload, where: [c, v] }), Promise.resolve({ error: null })) }),
      }
      return chain
    },
  },
}))

import PlannedSection from '../components/PlannedSection.vue'

const lastPlan = () => h.calls.filter((c) => c.op === 'upsert').at(-1)?.payload.planned_goals
const q = (sel: string) => document.body.querySelector<HTMLElement>(sel)
const qa = (sel: string) => [...document.body.querySelectorAll<HTMLElement>(sel)]

let w: VueWrapper | null = null
async function mountSection(date?: string) {
  w = mount(PlannedSection, { props: { userId: 'u1', date }, attachTo: document.body })
  await flushPromises()
}
beforeEach(() => {
  h.calls = []
  h.noteData = null
  h.goalsData = []
  h.windowNotes = []
})
afterEach(() => {
  w?.unmount()
  w = null
  document.body.innerHTML = ''
})

describe('PlannedSection: план на день', () => {
  it('пустой план — подсказка; добавление своего пункта по Enter пишет его в план и очищает поле', async () => {
    await mountSection()
    expect(q('[data-test="planned"]')!.textContent).toContain(t('dash_planned_empty'))
    const input = q('[data-test="custom-input"]') as HTMLInputElement
    input.value = 'Купить молоко'
    input.dispatchEvent(new Event('input'))
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    await flushPromises()
    expect(lastPlan()).toEqual([{ type: 'custom', text: 'Купить молоко', done: false }])
    expect(input.value).toBe('')
    expect(qa('[data-test="item"]')).toHaveLength(1)
  })

  it('пустой ввод ничего не пишет', async () => {
    await mountSection()
    qa('[data-test="add-custom"]')[0].click()
    await flushPromises()
    expect(h.calls.filter((c) => c.op === 'upsert')).toHaveLength(0)
  })

  it('три вида пунктов-целей: одноэтапная (чекбокс), многоэтапная (этап/этапов), удалённая (предупреждение)', async () => {
    h.noteData = { planned_goals: [{ type: 'goal', text: 'Одна' }, { type: 'goal', text: 'Много' }, { type: 'goal', text: 'Удалена' }] }
    h.goalsData = [
      { id: '1', name: 'Одна', stages: null, done: true, current_stage: null },
      { id: '2', name: 'Много', stages: 5, done: false, current_stage: 2 },
    ]
    await mountSection()
    const rows = qa('[data-test="item"]')
    expect(rows).toHaveLength(3)
    expect((rows[0].querySelector('[data-test="goal-check"]') as HTMLInputElement).checked).toBe(true)
    expect(rows[1].querySelector('[data-test="goal-check"]')).toBeNull()
    expect(rows[1].textContent).toContain('2/5')
    expect(rows[2].textContent).toContain(t('dash_goal_deleted_suffix').trim())
    expect(rows[2].querySelector('[data-test="bonus"]')).toBeNull() // у удалённой цели нет звёздочки
  })

  it('чекбокс одноэтапной цели пишет в саму цель, а не в план', async () => {
    h.noteData = { planned_goals: [{ type: 'goal', text: 'Одна' }] }
    h.goalsData = [{ id: 'g9', name: 'Одна', stages: 1, done: false, current_stage: null }]
    await mountSection()
    const cb = q('[data-test="goal-check"]') as HTMLInputElement
    cb.checked = true
    cb.dispatchEvent(new Event('change'))
    await flushPromises()
    expect(h.calls.find((c) => c.op === 'update')).toMatchObject({ table: 'goals', payload: { done: true, done_date: todayStr() }, where: ['id', 'g9'] })
    expect(h.calls.some((c) => c.op === 'upsert')).toBe(false)
  })

  it('цель, отмеченная в плане ПРОШЛОГО дня, получает дату выполнения того дня, а не сегодняшнюю (решение владельца 2026-10-04)', async () => {
    h.noteData = { planned_goals: [{ type: 'goal', text: 'Одна' }] }
    h.goalsData = [{ id: 'g9', name: 'Одна', stages: 1, done: false, current_stage: null }]
    await mountSection('2026-09-20')
    const cb = q('[data-test="goal-check"]') as HTMLInputElement
    cb.checked = true
    cb.dispatchEvent(new Event('change'))
    await flushPromises()
    expect(h.calls.find((c) => c.op === 'update')).toMatchObject({ table: 'goals', payload: { done: true, done_date: '2026-09-20' }, where: ['id', 'g9'] })
    cb.checked = false
    cb.dispatchEvent(new Event('change'))
    await flushPromises()
    expect(h.calls.filter((c) => c.op === 'update')[1].payload).toEqual({ done: false, done_date: null })
  })

  it('чекбокс своего пункта и звёздочка «доп. пункт» сохраняются в плане', async () => {
    h.noteData = { planned_goals: [{ type: 'custom', text: 'Свой', done: false }] }
    await mountSection()
    const cb = q('[data-test="custom-check"]') as HTMLInputElement
    cb.checked = true
    cb.dispatchEvent(new Event('change'))
    await flushPromises()
    expect(lastPlan()).toEqual([{ type: 'custom', text: 'Свой', done: true }])
    q('[data-test="bonus"]')!.click()
    await flushPromises()
    expect(lastPlan()).toEqual([{ type: 'custom', text: 'Свой', done: true, bonus: true }])
  })

  it('удаление пункта убирает именно его', async () => {
    h.noteData = { planned_goals: [{ type: 'custom', text: 'Один', done: false }, { type: 'custom', text: 'Два', done: false }] }
    await mountSection()
    qa('[data-test="remove"]')[0].click()
    await flushPromises()
    expect(lastPlan()).toEqual([{ type: 'custom', text: 'Два', done: false }])
  })
})

describe('PlannedSection: добавить из целей', () => {
  it('нет доступных целей — сообщение в карточке, окно не открывается', async () => {
    h.goalsData = [{ id: '1', name: 'Готова', stages: null, done: true, current_stage: null }]
    await mountSection()
    q('[data-test="add-goal"]')!.click()
    await flushPromises()
    expect(q('[data-test="notice"]')!.textContent).toBe(t('dash_planned_no_goals_toast'))
    expect(q('.modal')).toBeNull()
  })

  it('выбор цели добавляет пункт-цель; уже запланированные и выполненные в списке не предлагаются', async () => {
    h.noteData = { planned_goals: [{ type: 'goal', text: 'В плане' }] }
    h.goalsData = [
      { id: '1', name: 'В плане', stages: null, done: false, current_stage: null },
      { id: '2', name: 'Готова', stages: null, done: true, current_stage: null },
      { id: '3', name: 'Свободная', stages: null, done: false, current_stage: null },
    ]
    await mountSection()
    q('[data-test="add-goal"]')!.click()
    await flushPromises()
    expect(qa('[data-test="goal-select"] option').map((o) => o.textContent)).toEqual(['Свободная'])
    q('[data-test="ok"]')!.click()
    await flushPromises()
    expect(lastPlan()).toEqual([{ type: 'goal', text: 'В плане' }, { type: 'goal', text: 'Свободная' }])
    expect(q('.modal')).toBeNull()
  })
})

describe('PlannedSection: перенос незавершённого', () => {
  it('кнопка переноса — только для сегодняшнего дня', async () => {
    await mountSection('2020-01-01')
    expect(q('[data-test="carry"]')).toBeNull()
    w!.unmount()
    document.body.innerHTML = ''
    await mountSection()
    expect(q('[data-test="carry"]')).not.toBeNull()
  })

  it('нечего переносить — сообщение в карточке', async () => {
    await mountSection()
    q('[data-test="carry"]')!.click()
    await flushPromises()
    expect(q('[data-test="notice"]')!.textContent).toBe(t('dash_planned_carry_over_empty'))
    expect(q('.modal')).toBeNull()
  })

  it('окно с кандидатами: все отмечены, снятые не переносятся, в план попадают невыполненными', async () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const y = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`
    h.noteData = { planned_goals: [{ type: 'custom', text: 'Уже в плане', done: false }] }
    h.windowNotes = [{ date: y, planned_goals: [{ type: 'custom', text: 'Позвонить', done: false }, { type: 'custom', text: 'Уже в плане', done: false }, { type: 'custom', text: 'Оплатить', done: false }, { type: 'custom', text: 'Сделано', done: true }] }]
    await mountSection()
    q('[data-test="carry"]')!.click()
    await flushPromises()
    const rows = qa('[data-test="candidate"]')
    expect(rows.map((r) => r.textContent)).toEqual([expect.stringContaining('Позвонить'), expect.stringContaining('Оплатить')])
    ;(rows[1].querySelector('input') as HTMLInputElement).click() // снимаем «Оплатить»
    await flushPromises()
    q('[data-test="add"]')!.click()
    await flushPromises()
    expect(lastPlan()).toEqual([{ type: 'custom', text: 'Уже в плане', done: false }, { type: 'custom', text: 'Позвонить', done: false }])
    expect(q('.modal')).toBeNull()
  })

  it('все галочки сняты — план не трогаем', async () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const y = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`
    h.windowNotes = [{ date: y, planned_goals: [{ type: 'custom', text: 'Один', done: false }] }]
    await mountSection()
    q('[data-test="carry"]')!.click()
    await flushPromises()
    ;(q('[data-test="candidate"] input') as HTMLInputElement).click()
    await flushPromises()
    q('[data-test="add"]')!.click()
    await flushPromises()
    expect(h.calls.filter((c) => c.op === 'upsert')).toHaveLength(0)
  })
})

describe('PlannedSection: без пользователя', () => {
  it('ничего не грузит и не рисует', async () => {
    w = mount(PlannedSection, { props: { userId: null }, attachTo: document.body })
    await flushPromises()
    expect(q('[data-test="planned"]')).toBeNull()
    expect(h.calls).toHaveLength(0)
  })
})

describe('PlannedSection: время плана подтягивается (BACKLOG 14, 11:08)', () => {
  it('время из поля рядом с «Добавить» попадает и в цель, выбранную из списка', async () => {
    h.goalsData = [{ id: '3', name: 'Свободная', stages: null, done: false, current_stage: null }]
    await mountSection()
    const time = q('[data-test="new-time"]') as HTMLInputElement
    time.value = '09:30'
    time.dispatchEvent(new Event('input'))
    await flushPromises()
    q('[data-test="add-goal"]')!.click()
    await flushPromises()
    q('[data-test="ok"]')!.click()
    await flushPromises()
    expect(lastPlan()).toEqual([{ type: 'goal', text: 'Свободная', time: '09:30' }])
    expect((q('[data-test="new-time"]') as HTMLInputElement).value).toBe('')
  })

  it('при переносе незавершённого время исходного пункта сохраняется', async () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const y = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`
    h.windowNotes = [{ date: y, planned_goals: [{ type: 'custom', text: 'Позвонить', done: false, time: '18:00' }] }]
    await mountSection()
    q('[data-test="carry"]')!.click()
    await flushPromises()
    expect(q('[data-test="candidate"]')!.textContent).toContain('18:00')
    q('[data-test="add"]')!.click()
    await flushPromises()
    expect(lastPlan()).toEqual([{ type: 'custom', text: 'Позвонить', done: false, time: '18:00' }])
  })
})

