import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'

// «Карточка со сводкой» (BACKLOG 498, срез 3): у СВЁРНУТОГО блока справа от заголовка — короткая строка итога.
const h = vi.hoisted(() => ({ noteData: null as unknown, goalsData: [] as unknown[] }))
vi.mock('./lib/supabase', () => ({
  sb: {
    from: (table: string) => {
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: () => chain,
        gte: () => chain,
        lt: () => chain,
        maybeSingle: () => Promise.resolve({ data: table === 'daily_notes' ? h.noteData : null, error: null }),
        then: (res: (v: unknown) => unknown) => Promise.resolve({ data: table === 'goals' ? h.goalsData : [], error: null }).then(res),
        upsert: () => Promise.resolve({ error: null }),
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      }
      return chain
    },
  },
}))

import CollapseSummary from './components/CollapseSummary.vue'
import SectionHeading from './components/SectionHeading.vue'
import PlannedSection from './components/PlannedSection.vue'
import { collapseStyle, lastOpened } from './lib/useCollapseStyle'
import { plannedCounts, plannedSummary, pointsSummary, widgetsSummary } from './lib/collapseSummaries'

let w: VueWrapper | null = null
beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  collapseStyle.value = 'chevron'
  lastOpened.value = null
  h.noteData = null
  h.goalsData = []
})
afterEach(() => {
  w?.unmount()
  w = null
  document.body.innerHTML = ''
})

describe('строки итога (чистая логика)', () => {
  const goals = [
    { name: 'Одна', stages: null, done: true, current_stage: null },
    { name: 'Много', stages: 5, done: false, current_stage: 2 },
  ]
  it('планы: считаются выполненные пункты; удалённая цель в счёт не идёт; пустой план — без итога', () => {
    const plan = [
      { type: 'custom', text: 'Молоко', done: true },
      { type: 'custom', text: 'Почта', done: false },
      { type: 'goal', text: 'Одна' }, // выполнена
      { type: 'goal', text: 'Много' }, // 2 из 5 этапов — не выполнена
      { type: 'goal', text: 'Удалена' }, // нет такой цели — не считаем
    ]
    expect(plannedCounts(plan, goals)).toEqual({ done: 2, total: 4 })
    expect(plannedSummary(plan, goals)).toBe('Выполнено 2 из 4')
    expect(plannedSummary([], goals)).toBe('')
  })
  it('баллы за день и виджеты: пустое — без итога', () => {
    expect(pointsSummary(4, 9)).toBe('Баллы 4 / 9')
    expect(pointsSummary(0, 0)).toBe('')
    expect(widgetsSummary(3)).toBe('Виджетов: 3')
    expect(widgetsSummary(0)).toBe('')
  })
  it('на английском', () => {
    localStorage.setItem('site_lang', 'en')
    expect(pointsSummary(4, 9)).toBe('Points 4 / 9')
    expect(plannedSummary([{ type: 'custom', text: 'a', done: true }], [])).toBe('Done 1 of 1')
  })
})

describe('плашка CollapseSummary', () => {
  const mk = (collapsed: boolean, text: string | null = '3 из 5') => mount(CollapseSummary, { props: { text, collapsed } })
  it('показывается только при виде «сводка», свёрнутом блоке и непустом тексте', () => {
    collapseStyle.value = 'summary'
    expect(mk(true).find('[data-test="collapse-summary"]').text()).toBe('3 из 5')
    expect(mk(false).find('[data-test="collapse-summary"]').exists()).toBe(false) // развёрнут
    expect(mk(true, '').find('[data-test="collapse-summary"]').exists()).toBe(false) // нет итога
    expect(mk(true, null).find('[data-test="collapse-summary"]').exists()).toBe(false)
    expect(mk(true, '   ').find('[data-test="collapse-summary"]').exists()).toBe(false)
  })
  it('шеврон и аккордеон — плашки нет', () => {
    for (const s of ['chevron', 'accordion'] as const) {
      collapseStyle.value = s
      expect(mk(true).find('[data-test="collapse-summary"]').exists()).toBe(false)
    }
  })
})

describe('SectionHeading с итогом', () => {
  const mk = (collapsed: boolean) => mount(SectionHeading, { props: { title: 'Блок', storageKey: 'sum_test', summary: 'Баллы 4 / 9', collapsed } })
  it('«сводка»: свёрнутый заголовок показывает итог, развёрнутый — нет; клик раскрывает и итог исчезает', async () => {
    collapseStyle.value = 'summary'
    w = mk(true)
    expect(w.find('[data-test="collapse-summary"]').text()).toBe('Баллы 4 / 9')
    await w.setProps({ collapsed: false })
    expect(w.find('[data-test="collapse-summary"]').exists()).toBe(false)
  })
  it('базовый шеврон — итога нет даже у свёрнутого блока', () => {
    w = mk(true)
    expect(w.find('[data-test="collapse-summary"]').exists()).toBe(false)
  })
})

describe('«Планы» на странице: итог по реальным данным', () => {
  async function mountPlanned() {
    w = mount(PlannedSection, { props: { userId: 'u1' }, attachTo: document.body })
    await flushPromises()
  }
  const toggle = () => document.body.querySelector<HTMLElement>('[data-test="collapse-toggle"]')!
  const pill = () => document.body.querySelector<HTMLElement>('[data-test="collapse-summary"]')

  it('«сводка»: свернули «Планы» — справа «Выполнено 2 из 3»', async () => {
    collapseStyle.value = 'summary'
    h.noteData = { planned_goals: [{ type: 'custom', text: 'А', done: true }, { type: 'custom', text: 'Б', done: false }, { type: 'goal', text: 'Одна' }] }
    h.goalsData = [{ id: '1', name: 'Одна', stages: null, done: true, current_stage: null }]
    await mountPlanned()
    expect(pill()).toBeNull() // развёрнут — итога нет
    toggle().click()
    await flushPromises()
    expect(pill()?.textContent).toBe('Выполнено 2 из 3')
  })

  it('пустой план — плашки нет даже в свёрнутом виде', async () => {
    collapseStyle.value = 'summary'
    await mountPlanned()
    toggle().click()
    await flushPromises()
    expect(pill()).toBeNull()
  })

  it('шеврон — плашки нет', async () => {
    h.noteData = { planned_goals: [{ type: 'custom', text: 'А', done: true }] }
    await mountPlanned()
    toggle().click()
    await flushPromises()
    expect(pill()).toBeNull()
  })
})
