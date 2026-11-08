import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import GoalForm from './components/GoalForm.vue'
import GoalCard from './components/GoalCard.vue'
import { buildInsertRow, buildUpdateRow, normalizeStepNames, stepLabel } from './lib/goals'
import { buildNextRow } from './lib/repeatGoal'
import type { Goal, GoalFormInitial, GoalFormInput } from './lib/types'

// BACKLOG 76.2 (срез 1): названия этапов цели (миграция 121). Прогресс по-прежнему stages/current_stage.
beforeEach(() => localStorage.setItem('site_lang', 'ru'))
const goal = (over: Partial<Goal> = {}): Goal =>
  ({ id: 'g', user_id: 'u', name: 'Ремонт', points: 10, category: 'Дом', stages: 3, current_stage: 1, done: false, done_date: null, deadline: null, difficulty: null, step_names: ['Смета', '', 'Покраска'], created_at: '2026-01-01', ...over }) as Goal

describe('normalizeStepNames / stepLabel', () => {
  it('обрезает пробелы и длину, лишнее сверх этапов и пустые хвосты', () => {
    expect(normalizeStepNames([' Смета ', '', 'Краска', 'Лишний', ''], 3)).toEqual(['Смета', '', 'Краска'])
    expect(normalizeStepNames(['A', ' ', ''], 3)).toEqual(['A'])
    expect(normalizeStepNames(['x'.repeat(200)], 2)[0]).toHaveLength(80)
    expect(normalizeStepNames('нет', 3)).toEqual([])
  })
  it('название этапа или «Этап N»', () => {
    expect(stepLabel(['Смета', '', 'Краска'], 1, 'Этап')).toBe('Смета')
    expect(stepLabel(['Смета', '', 'Краска'], 2, 'Этап')).toBe('Этап 2')
    expect(stepLabel(null, 4, 'Этап')).toBe('Этап 4')
  })
})

describe('запись в базу', () => {
  const res = { name: 'Ремонт', category: '', stages: 3, difficulty: null, deadline: '', stepNames: ['Смета', 'Материалы', ''] } as GoalFormInput
  it('колонки нет — не пишем; есть — пишем; одноэтапная и без названий — null', () => {
    expect(buildInsertRow(res, 'Без')).not.toHaveProperty('step_names')
    expect(buildInsertRow(res, 'Без', { stepsColumn: true })).toMatchObject({ step_names: ['Смета', 'Материалы'] })
    expect(buildInsertRow({ ...res, stages: 1 }, 'Без', { stepsColumn: true })).toMatchObject({ step_names: null })
    expect(buildUpdateRow({ ...res, stepNames: [] }, goal(), 'Без', { stepsColumn: true })).toMatchObject({ step_names: null })
  })
  it('повторяющаяся цель переносит названия в следующую', () => {
    expect(buildNextRow(goal({ repeat_every: 'month', deadline: '2026-11-05' }), '2026-11-06').step_names).toEqual(['Смета', '', 'Покраска'])
  })
})

describe('форма и карточка', () => {
  const base: GoalFormInitial = { name: 'Ремонт', points: 5, category: '', stages: 3, difficulty: null, deadline: '', stepNames: ['Смета'] }
  it('поле названий — только с колонкой и при нескольких этапах; уходит в submit', async () => {
    const submit = vi.fn(async () => {})
    const off = mount(GoalForm, { props: { isEdit: false, initial: base, submit, stepsColumn: false }, attachTo: document.body })
    expect(off.find('[data-test="goal-step-names"]').exists()).toBe(false)
    off.unmount()
    const w = mount(GoalForm, { props: { isEdit: false, initial: base, submit, stepsColumn: true }, attachTo: document.body })
    const ta = w.get('[data-test="goal-step-names"]')
    expect((ta.element as HTMLTextAreaElement).value).toBe('Смета')
    await ta.setValue('Смета\nМатериалы')
    await w.get('[data-test="goal-form-save"]').trigger('click')
    await flushPromises()
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ stepNames: ['Смета', 'Материалы'] }))
    w.unmount()
  })
  it('карточка показывает названия этапов, у безымянных — «Этап N»', async () => {
    const w = mount(GoalCard, { props: { goal: goal() } })
    await w.get('[data-test="goal-expand"]').trigger('click')
    const names = w.findAll('[data-test="goal-stage-name"]').map((x) => x.text())
    expect(names).toEqual(['Смета', 'Этап 2', 'Покраска'])
  })
})
