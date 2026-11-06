import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import GoalForm from './components/GoalForm.vue'
import type { GoalFormInitial, GoalFormInput } from './lib/types'

// BACKLOG 81.4: поле «Повтор» — только с колонкой (миграция 120), только у цели с конкретным сроком; в сохранение уходит выбранный повтор.
beforeEach(() => localStorage.setItem('site_lang', 'ru'))
const base: GoalFormInitial = { name: 'Оплатить счета', points: 5, category: '', stages: 1, difficulty: null, deadline: '', horizon: 'day' }
function mountForm(repeatColumn: boolean, initial: Partial<GoalFormInitial> = {}, submit: (r: GoalFormInput) => Promise<void> = async () => {}) {
  return mount(GoalForm, { props: { isEdit: false, initial: { ...base, ...initial }, submit, repeatColumn, horizonColumn: true }, attachTo: document.body })
}

describe('форма цели: повтор', () => {
  it('без колонки поля «Повтор» нет', () => {
    const w = mountForm(false, { deadline: '2026-11-05' })
    expect(w.find('[data-test="goal-repeat-select"]').exists()).toBe(false)
    w.unmount()
  })
  it('с колонкой и сроком поле есть; выбор уходит в submit', async () => {
    const submit = vi.fn(async () => {})
    const w = mountForm(true, { deadline: '2026-11-05' }, submit)
    const sel = w.find('[data-test="goal-repeat-select"]')
    expect(sel.exists()).toBe(true)
    expect(w.find('[data-test="goal-repeat-hint"]').exists()).toBe(false)
    await sel.setValue('month')
    expect(w.find('[data-test="goal-repeat-hint"]').exists()).toBe(true)
    await w.find('[data-test="goal-form-save"]').trigger('click')
    await flushPromises()
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ repeat: 'month', deadline: '2026-11-05' }))
    w.unmount()
  })
  it('у существующей повторяющейся цели выбранное значение подставлено; «Не повторять» даёт null', async () => {
    const submit = vi.fn(async () => {})
    const w = mountForm(true, { deadline: '2026-11-05', repeat: 'week' }, submit)
    expect((w.find('[data-test="goal-repeat-select"]').element as HTMLSelectElement).value).toBe('week')
    await w.find('[data-test="goal-repeat-select"]').setValue('')
    await w.find('[data-test="goal-form-save"]').trigger('click')
    await flushPromises()
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ repeat: null }))
    w.unmount()
  })
})
