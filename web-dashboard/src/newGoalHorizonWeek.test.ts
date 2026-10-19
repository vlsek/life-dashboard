import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PlannedNewGoalModal from './components/PlannedNewGoalModal.vue'
import { buildInsertRow, horizonOptions, type GoalFormInput } from './lib/newGoal'

// BACKLOG 1052 срез 2: горизонт «На неделю» (миграция 086) в копии окна «Новая цель» на главной.
beforeEach(() => localStorage.setItem('site_lang', 'ru'))
const base: GoalFormInput = { name: 'Цель', category: '', stages: 1, difficulty: null, deadline: '' }

describe('«На неделю» в окне «Новая цель» на главной', () => {
  it('пункты: без колонки — «Сейчас»/«В конкретный день»; с колонкой — все пять, «На неделю» между «Скоро» и «Месяц»', () => {
    expect(horizonOptions(false)).toEqual(['now', 'day'])
    expect(horizonOptions(true)).toEqual(['now', 'soon', 'week', 'month', 'day'])
    const w = mount(PlannedNewGoalModal, { props: { submit: async () => {}, horizonColumn: true }, attachTo: document.body })
    expect(w.findAll('[data-test="goal-horizon-select"] option').map((o) => o.text())).toEqual(['Сейчас', 'В ближайшее время', 'На неделю', 'В ближайший месяц', 'В конкретный день'])
    w.unmount()
  })
  it('запись: horizon=week пишется с колонкой, срок не пишется', () => {
    const row = buildInsertRow({ ...base, horizon: 'week' }, 'Без категории', { horizonColumn: true })
    expect(row).toMatchObject({ horizon: 'week' })
    expect(row).not.toHaveProperty('deadline')
  })
  it('база отклонила «На неделю» (нет миграции 086) — человеку «пока недоступен», про миграцию только в консоли; окно не закрывается', async () => {
    const submit = vi.fn(async () => {
      throw { message: 'new row for relation "goals" violates check constraint "goals_horizon_check"', code: '23514' }
    })
    const w = mount(PlannedNewGoalModal, { props: { submit, horizonColumn: true }, attachTo: document.body })
    const name = w.find('[data-test="new-goal-name"]')
    await name.setValue('Йога')
    await w.find('[data-test="goal-horizon-select"]').setValue('week')
    await w.find('[data-test="goal-form-save"]').trigger('click')
    await Promise.resolve()
    await Promise.resolve()
    const shown = w.find('[data-test="goal-form-error"]').text()
    expect(shown).toContain('пока недоступен')
    expect(shown).not.toMatch(/миграц|086|Supabase/i)
    w.unmount()
  })
})
