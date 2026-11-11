import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PlannedNewGoalModal from './components/PlannedNewGoalModal.vue'
import { buildInsertRow, normalizeStepNames, repeatFields, stepNamesFields, type GoalFormInput } from './lib/newGoal'

// Копия окна «Новая цель» догнала «Цели»: повтор (миграция 120, 81.4) и названия этапов (миграция 121, 76.2) — поля видны только при наличии колонок.
const mountModal = (p: { repeatColumn?: boolean; stepsColumn?: boolean; horizonColumn?: boolean } = {}, submit: (r: GoalFormInput) => Promise<void> = async () => {}) =>
  mount(PlannedNewGoalModal, { props: { submit, horizonColumn: true, ...p }, attachTo: document.body })
const base: GoalFormInput = { name: 'A', category: '', stages: 3, difficulty: null, deadline: '2026-11-20' }

describe('строка цели: повтор и названия этапов', () => {
  it('без колонок ключей нет; с колонками — пишутся; у цели на вес и без срока повтора нет; у одноэтапной названий нет', () => {
    expect(buildInsertRow({ ...base, repeat: 'week', stepNames: ['x'] }, 'Без')).not.toHaveProperty('repeat_every')
    expect(buildInsertRow({ ...base, repeat: 'week', stepNames: ['x'] }, 'Без')).not.toHaveProperty('step_names')
    const row = buildInsertRow({ ...base, repeat: 'week', stepNames: [' Старт ', '', 'Финиш', ''] }, 'Без', { repeatColumn: true, stepsColumn: true })
    expect(row).toMatchObject({ repeat_every: 'week', step_names: ['Старт', '', 'Финиш'] })
    expect(repeatFields({ repeat: 'month', deadline: '' }, true)).toEqual({ repeat_every: null })
    expect(repeatFields({ repeat: 'month', deadline: '2026-11-20', weightMode: 'lose' }, true)).toEqual({ repeat_every: null })
    expect(stepNamesFields({ stepNames: ['a'], stages: 1 }, true)).toEqual({ step_names: null })
    expect(normalizeStepNames(['a', 'b', 'c'], 2)).toEqual(['a', 'b'])
  })
})

describe('окно «Новая цель»: поля повтора и этапов', () => {
  it('названия этапов — только с колонкой и при числе этапов больше одного', async () => {
    const a = mountModal({ stepsColumn: false })
    await a.find('input[type="number"]').setValue(3)
    expect(a.find('[data-test="goal-step-names"]').exists()).toBe(false)
    a.unmount()
    const b = mountModal({ stepsColumn: true })
    expect(b.find('[data-test="goal-step-names"]').exists()).toBe(false)
    await b.find('input[type="number"]').setValue(3)
    expect(b.find('[data-test="goal-step-names"]').exists()).toBe(true)
    b.unmount()
  })
  it('повтор — только с колонкой и у цели «В конкретный день»; уходит в submit', async () => {
    const submit = vi.fn(async () => {})
    const w = mountModal({ repeatColumn: true }, submit)
    await w.find('[data-test="new-goal-name"]').setValue('Цель')
    expect(w.find('[data-test="goal-repeat-select"]').exists()).toBe(false)
    await w.find('[data-test="goal-horizon-select"]').setValue('day')
    await w.find('[data-test="goal-deadline"]').setValue('2026-11-20')
    await w.find('[data-test="goal-repeat-select"]').setValue('month')
    await w.find('[data-test="goal-form-save"]').trigger('click')
    await Promise.resolve()
    expect((submit.mock.calls[0] as unknown as [GoalFormInput])[0]).toMatchObject({ repeat: 'month', deadline: '2026-11-20' })
    w.unmount()
    const x = mountModal({ repeatColumn: false })
    await x.find('[data-test="goal-horizon-select"]').setValue('day')
    expect(x.find('[data-test="goal-repeat-select"]').exists()).toBe(false)
    x.unmount()
  })
})
