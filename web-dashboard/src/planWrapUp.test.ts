import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { addManyToNextDay, postponeCandidates } from './lib/planPostpone'
import { addDaysIso, todayStr } from './lib/date'

// Вечерний шаг «что перенести» (BACKLOG 75.12, срез 2)
const h = vi.hoisted(() => ({ store: {} as Record<string, any[]>, writes: [] as { date: string; list: any[] }[], failWriteFor: null as string | null, failReadFor: null as string | null }))
vi.mock('./lib/supabase', () => ({
  sb: {
    from: (table: string) => {
      let date = ''
      const chain: any = {
        select: () => chain,
        eq: (col: string, v: string) => ((col === 'date' && (date = v)), chain),
        gte: () => chain,
        lt: () => chain,
        order: () => chain,
        maybeSingle: () =>
          Promise.resolve(
            table === 'daily_notes'
              ? h.failReadFor === date
                ? { data: null, error: { message: 'read boom' } }
                : { data: h.store[date] ? { planned_goals: h.store[date] } : null, error: null }
              : { data: null, error: null },
          ),
        then: (res: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(res),
        upsert: (row: { date: string; planned_goals: any[] }) => {
          if (h.failWriteFor === row.date) return Promise.resolve({ error: { message: 'write boom' } })
          h.writes.push({ date: row.date, list: row.planned_goals })
          h.store[row.date] = row.planned_goals
          return Promise.resolve({ error: null })
        },
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      }
      return chain
    },
  },
}))
import PlannedSection from './components/PlannedSection.vue'

const TODAY = todayStr()
const TOMORROW = addDaysIso(TODAY, 1)

describe('postponeCandidates / addManyToNextDay', () => {
  it('кандидаты — только свои невыполненные пункты без повтора, с позицией в плане', () => {
    const plan = [{ type: 'custom', text: 'А' }, { type: 'goal', text: 'Цель' }, { type: 'custom', text: 'Б', done: true }, { type: 'custom', text: 'В', repeat: 'r1' }, { type: 'custom', text: 'Г', time: '10:00' }]
    expect(postponeCandidates(plan).map((x) => [x.index, x.item.text])).toEqual([[0, 'А'], [4, 'Г']])
  })
  it('пакет дописывается в конец по порядку; повтор внутри пакета и уже имеющийся завтра пункт не дублируются', () => {
    const tomorrow = [{ type: 'custom', text: 'Есть', time: '09:00' }]
    const r = addManyToNextDay(tomorrow, [{ type: 'custom', text: 'А' }, { type: 'custom', text: 'А' }, { type: 'custom', text: 'Есть', time: '09:00' }, { type: 'custom', text: 'Б', time: '18:00', bonus: true }])
    expect(r.added).toBe(2)
    expect(r.duplicates).toBe(2)
    expect(r.list).toEqual([{ type: 'custom', text: 'Есть', time: '09:00' }, { type: 'custom', text: 'А' }, { type: 'custom', text: 'Б', time: '18:00', bonus: true }])
  })
})

describe('PlannedSection: вечерний шаг', () => {
  let w: VueWrapper | null = null
  beforeEach(() => {
    localStorage.setItem('site_lang', 'ru')
    h.writes = []
    h.failWriteFor = null
    h.failReadFor = null
    h.store = {
      [TODAY]: [
        { type: 'custom', text: 'Врач', time: '18:30' },
        { type: 'goal', text: 'Цель' },
        { type: 'custom', text: 'Хлеб', done: true },
        { type: 'custom', text: 'Позвонить' },
        { type: 'custom', text: 'Зарядка', repeat: 'r1' },
        { type: 'custom', text: 'Отчёт', bonus: true },
      ],
    }
  })
  afterEach(() => {
    w?.unmount()
    w = null
    document.body.innerHTML = ''
  })
  async function mountSection() {
    w = mount(PlannedSection, { props: { userId: 'u1', date: TODAY }, attachTo: document.body })
    await flushPromises()
  }
  const open = async () => {
    await w!.get('[data-test="wrapup-open"]').trigger('click')
  }

  it('кнопка есть, только если есть что переносить', async () => {
    await mountSection()
    expect(w!.find('[data-test="wrapup-open"]').exists()).toBe(true)
    w!.unmount()
    h.store = { [TODAY]: [{ type: 'goal', text: 'Цель' }, { type: 'custom', text: 'Готово', done: true }, { type: 'custom', text: 'Повтор', repeat: 'r' }] }
    await mountSection()
    expect(w!.find('[data-test="wrapup-open"]').exists()).toBe(false)
  })

  it('окно: все подходящие пункты отмечены по умолчанию, цели, выполненные и повторы в списке не показываются', async () => {
    await mountSection()
    await open()
    const rows = w!.findAll('[data-test="wu-row"]')
    expect(rows.map((r) => r.text())).toEqual(['Врач18:30', 'Позвонить', 'Отчёт']) // время — отдельный элемент с отступом, пробела в тексте нет
    expect(w!.findAll('[data-test="wu-check"]').every((c) => (c.element as HTMLInputElement).checked)).toBe(true)
    expect(w!.get('[data-test="wu-move"]').text()).toContain('(3)')
  })

  it('перенос выбранных: одна запись завтра (по порядку, с временем и бонусом), одна запись сегодня; снятая галочка остаётся на сегодня', async () => {
    await mountSection()
    await open()
    await w!.findAll('[data-test="wu-check"]')[1].setValue(false) // «Позвонить» остаётся сегодня
    expect(w!.get('[data-test="wu-move"]').text()).toContain('(2)')
    await w!.get('[data-test="wu-move"]').trigger('click')
    await flushPromises()
    expect(h.store[TOMORROW]).toEqual([{ type: 'custom', text: 'Врач', time: '18:30' }, { type: 'custom', text: 'Отчёт', bonus: true }])
    expect(h.store[TODAY].map((x) => x.text)).toEqual(['Цель', 'Хлеб', 'Позвонить', 'Зарядка'])
    expect(h.writes.map((x) => x.date)).toEqual([TOMORROW, TODAY]) // сначала завтра, потом сегодня
    expect(w!.find('[data-test="wrapup-modal"]').exists()).toBe(false)
    expect(w!.get('[data-test="notice"]').text()).toBe('Перенесено на завтра: 2')
  })

  it('часть пунктов уже есть завтра — не дублируются, но с сегодняшнего снимаются; сообщение это говорит', async () => {
    h.store[TOMORROW] = [{ type: 'custom', text: 'Позвонить' }]
    await mountSection()
    await open()
    await w!.get('[data-test="wu-move"]').trigger('click')
    await flushPromises()
    expect(h.store[TOMORROW].filter((x) => x.text === 'Позвонить')).toHaveLength(1)
    expect(h.store[TODAY].map((x) => x.text)).toEqual(['Цель', 'Хлеб', 'Зарядка'])
    expect(w!.get('[data-test="notice"]').text()).toBe('Перенесено на завтра: 3 · уже были там: 1')
  })

  it('ничего не выбрано — кнопка «Перенести» недоступна', async () => {
    await mountSection()
    await open()
    for (const c of w!.findAll('[data-test="wu-check"]')) await c.setValue(false)
    expect((w!.get('[data-test="wu-move"]').element as HTMLButtonElement).disabled).toBe(true)
  })

  it('не удалось записать завтра — всё остаётся сегодня, окно открыто с понятной ошибкой', async () => {
    h.failWriteFor = TOMORROW
    await mountSection()
    await open()
    await w!.get('[data-test="wu-move"]').trigger('click')
    await flushPromises()
    expect(h.store[TODAY].map((x) => x.text)).toEqual(['Врач', 'Цель', 'Хлеб', 'Позвонить', 'Зарядка', 'Отчёт'])
    expect(h.store[TOMORROW]).toBeUndefined()
    expect(w!.get('[data-test="wu-error"]').text()).toContain('остались на месте')
    expect(w!.find('[data-test="wrapup-modal"]').exists()).toBe(true)
  })

  it('не удалось прочитать план завтра — ничего не пишем', async () => {
    h.failReadFor = TOMORROW
    await mountSection()
    await open()
    await w!.get('[data-test="wu-move"]').trigger('click')
    await flushPromises()
    expect(h.writes).toHaveLength(0)
    expect(w!.find('[data-test="wu-error"]').exists()).toBe(true)
  })

  it('окно закрывается по «Закрыть» и Esc без записи', async () => {
    await mountSection()
    await open()
    await w!.get('[data-test="wu-close"]').trigger('click')
    expect(w!.find('[data-test="wrapup-modal"]').exists()).toBe(false)
    await open()
    await w!.get('[data-test="wrapup-modal"]').trigger('keydown', { key: 'Escape' })
    expect(w!.find('[data-test="wrapup-modal"]').exists()).toBe(false)
    expect(h.writes).toHaveLength(0)
  })
})
