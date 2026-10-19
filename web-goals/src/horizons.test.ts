import { describe, expect, it, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import GoalForm from './components/GoalForm.vue'
import { effectiveHorizon, groupByHorizon, horizonFields, horizonOptions, loadGoalsView, saveGoalsView } from './lib/horizons'
import { buildInsertRow, buildUpdateRow } from './lib/goals'
import type { Goal, GoalFormInitial, GoalFormInput } from './lib/types'

// BACKLOG 1048+1050 «Горизонты целей», срез 1 (миграция 084).
beforeEach(() => localStorage.setItem('site_lang', 'ru'))

const goal = (o: Partial<Goal>): Goal => ({ id: 'g' + Math.random(), user_id: 'u', name: 'Цель', points: 5, category: '', stages: 1, current_stage: 0, done: false, done_date: null, deadline: null, difficulty: null, created_at: '2026-10-01', ...o })
const form = (o: Partial<GoalFormInput> = {}): GoalFormInput => ({ name: 'Цель', category: '', stages: 1, difficulty: null, deadline: '', ...o })

describe('effectiveHorizon', () => {
  it('сохранённый горизонт главнее срока', () => {
    expect(effectiveHorizon({ horizon: 'month', deadline: '2026-11-01' })).toBe('month')
    expect(effectiveHorizon({ horizon: 'soon', deadline: null })).toBe('soon')
  })
  it('без горизонта: есть срок — «В конкретный день», нет — «Сейчас»; мусор в колонке игнорируется', () => {
    expect(effectiveHorizon({ deadline: '2026-11-01' })).toBe('day')
    expect(effectiveHorizon({ deadline: null })).toBe('now')
    expect(effectiveHorizon({ horizon: 'weird', deadline: null })).toBe('now')
  })
})

describe('groupByHorizon', () => {
  it('только непустые разделы в порядке сейчас → скоро → неделя → месяц → день; день по дате, без даты в конец', () => {
    const gs = [goal({ name: 'd2', deadline: '2026-12-01' }), goal({ name: 'm', horizon: 'month' }), goal({ name: 'w', horizon: 'week' }), goal({ name: 'n' }), goal({ name: 'd1', deadline: '2026-11-01' }), goal({ name: 'd0', horizon: 'day' })]
    const r = groupByHorizon(gs)
    expect(r.map(([h]) => h)).toEqual(['now', 'week', 'month', 'day'])
    expect(r[3][1].map((g) => g.name)).toEqual(['d1', 'd2', 'd0'])
  })
})

describe('запись в базу', () => {
  it('без колонки: горизонт не пишется, срок только у «В конкретный день»', () => {
    expect(horizonFields({ horizon: 'day', deadline: '2026-11-01' }, false)).toEqual({ deadline: '2026-11-01' })
    expect(horizonFields({ horizon: 'now', deadline: '2026-11-01' }, false)).toEqual({ deadline: null })
    expect(horizonOptions(false)).toEqual(['now', 'day'])
  })
  it('с колонкой: пишется horizon; «Скоро»/«Месяц» без срока', () => {
    expect(horizonFields({ horizon: 'soon', deadline: '2026-11-01' }, true)).toEqual({ horizon: 'soon', deadline: null })
    expect(horizonOptions(true)).toEqual(['now', 'soon', 'week', 'month', 'day'])
    const row = buildInsertRow(form({ horizon: 'month' }), 'Без категории', { horizonColumn: true })
    expect(row).toMatchObject({ horizon: 'month' })
    expect(row).not.toHaveProperty('deadline') // у новой цели обнулять срок нечего
    const patch = buildUpdateRow(form({ horizon: 'day', deadline: '2026-11-05' }), goal({ horizon: 'now' }), 'Без категории', { horizonColumn: true })
    expect(patch).toMatchObject({ horizon: 'day', deadline: '2026-11-05' })
  })
  it('старый путь не меняется: форма без horizon и нет колонки — как до 084', () => {
    const row = buildInsertRow(form({ deadline: '2026-11-01' }), 'Без категории')
    expect(row).toMatchObject({ deadline: '2026-11-01' })
    expect(row).not.toHaveProperty('horizon')
  })
})

describe('вид страницы', () => {
  it('по умолчанию категории; «По срокам» запоминается', () => {
    localStorage.removeItem('goals_view')
    expect(loadGoalsView()).toBe('category')
    saveGoalsView('horizon')
    expect(loadGoalsView()).toBe('horizon')
    saveGoalsView('category')
    expect(loadGoalsView()).toBe('category')
  })
})

describe('форма цели: горизонт', () => {
  const base: GoalFormInitial = { name: 'Цель', points: 5, category: '', stages: 1, difficulty: null, deadline: '' }
  const mountForm = (initial: Partial<GoalFormInitial>, horizonColumn: boolean, submit: (r: GoalFormInput) => Promise<void> = async () => {}) =>
    mount(GoalForm, { props: { isEdit: false, initial: { ...base, ...initial }, horizonColumn, submit }, attachTo: document.body })
  const sel = (w: ReturnType<typeof mount>) => w.find('[data-test="goal-horizon-select"]')

  it('пункты зависят от колонки; у цели со сроком выбран «В конкретный день» и видна дата', () => {
    const w1 = mountForm({}, false)
    expect(sel(w1).findAll('option').map((o) => o.text())).toEqual(['Сейчас', 'В конкретный день'])
    expect(w1.find('[data-test="goal-deadline"]').exists()).toBe(false)
    w1.unmount()
    const w2 = mountForm({ deadline: '2026-11-01' }, true)
    expect(sel(w2).findAll('option')).toHaveLength(5)
    expect((sel(w2).element as HTMLSelectElement).value).toBe('day')
    expect(w2.find('[data-test="goal-deadline"]').exists()).toBe(true)
    w2.unmount()
  })
  it('«В конкретный день» без даты не сохраняется; с датой уходит deadline+horizon; «Месяц» — без срока', async () => {
    const submit = vi.fn(async () => {})
    const w = mountForm({}, true, submit)
    await sel(w).setValue('day')
    await w.find('[data-test="goal-form-save"]').trigger('click')
    expect(submit).not.toHaveBeenCalled()
    expect(w.find('[data-test="goal-form-error"]').text()).toContain('дату')
    await w.find('[data-test="goal-deadline"]').setValue('2026-11-09')
    await w.find('[data-test="goal-form-save"]').trigger('click')
    await Promise.resolve()
    expect((submit.mock.calls[0] as unknown as [GoalFormInput])[0]).toMatchObject({ horizon: 'day', deadline: '2026-11-09' })
    await sel(w).setValue('month')
    await w.find('[data-test="goal-form-save"]').trigger('click')
    await Promise.resolve()
    expect((submit.mock.calls[1] as unknown as [GoalFormInput])[0]).toMatchObject({ horizon: 'month', deadline: '' })
    w.unmount()
  })
  it('«На неделю» без миграции 086: база отклоняет значение — человеку говорят «пока недоступно» (про миграцию — только в консоли)', async () => {
    const submit = vi.fn(async () => {
      throw { message: 'new row for relation "goals" violates check constraint "goals_horizon_check"', code: '23514' }
    })
    const w = mountForm({}, true, submit)
    await sel(w).setValue('week')
    await w.find('[data-test="goal-form-save"]').trigger('click')
    await Promise.resolve()
    await Promise.resolve()
    const shown = w.find('[data-test="goal-form-error"]').text()
    expect(shown).toContain('пока недоступен')
    expect(shown).not.toMatch(/миграц|086|Supabase/i)
    w.unmount()
  })
})
