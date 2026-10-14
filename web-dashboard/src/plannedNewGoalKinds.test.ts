import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PlannedNewGoalModal from './components/PlannedNewGoalModal.vue'
import type { GoalFormInput } from './lib/newGoal'

// Окно «Новая цель» на главной = копия формы из «Целей»: горизонт (084) и тип цели на вес (085) показываются только при колонках в базе.
const mountModal = (p: { horizonColumn?: boolean; weightColumn?: boolean; currentWeight?: number | null } = {}, submit: (r: GoalFormInput) => Promise<void> = async () => {}) =>
  mount(PlannedNewGoalModal, { props: { submit, horizonColumn: false, weightColumn: false, currentWeight: null, ...p }, attachTo: document.body })
const saved = (submit: ReturnType<typeof vi.fn>, i = 0) => (submit.mock.calls[i] as unknown as [GoalFormInput])[0]

describe('«Новая цель» на главной: горизонт', () => {
  it('без колонки — «Сейчас» и «В конкретный день»; с колонкой — пять пунктов (с «На неделю»)', () => {
    const a = mountModal()
    expect(a.find('[data-test="goal-horizon-select"]').findAll('option')).toHaveLength(2)
    a.unmount()
    const b = mountModal({ horizonColumn: true })
    expect(b.find('[data-test="goal-horizon-select"]').findAll('option')).toHaveLength(5)
    b.unmount()
  })
  it('«В конкретный день» без даты не сохраняется; с датой уходит deadline+horizon; «Сейчас» — без срока', async () => {
    const submit = vi.fn(async () => {})
    const w = mountModal({}, submit)
    await w.find('[data-test="new-goal-name"]').setValue('Цель')
    await w.find('[data-test="goal-horizon-select"]').setValue('day')
    await w.find('[data-test="goal-form-save"]').trigger('click')
    expect(submit).not.toHaveBeenCalled()
    expect(w.find('[data-test="goal-form-error"]').exists()).toBe(true)
    await w.find('[data-test="goal-deadline"]').setValue('2026-11-09')
    await w.find('[data-test="goal-form-save"]').trigger('click')
    await Promise.resolve()
    expect(saved(submit)).toMatchObject({ horizon: 'day', deadline: '2026-11-09' })
    await w.find('[data-test="goal-horizon-select"]').setValue('now')
    await w.find('[data-test="goal-form-save"]').trigger('click')
    await Promise.resolve()
    expect(saved(submit, 1)).toMatchObject({ horizon: 'now', deadline: '' })
    w.unmount()
  })
})

describe('«Новая цель» на главной: цель на вес', () => {
  it('выбор типа есть только при колонках; обычная цель не шлёт ключей веса', async () => {
    const a = mountModal()
    expect(a.find('[data-test="goal-kind-select"]').exists()).toBe(false)
    a.unmount()
    const submit = vi.fn(async () => {})
    const w = mountModal({ weightColumn: true }, submit)
    expect(w.find('[data-test="goal-kind-select"]').exists()).toBe(true)
    await w.find('[data-test="new-goal-name"]').setValue('Цель')
    await w.find('[data-test="goal-form-save"]').trigger('click')
    await Promise.resolve()
    expect(saved(submit)).not.toHaveProperty('weightMode')
    w.unmount()
  })
  it('старт по умолчанию — последний вес тела; цель не в ту сторону не сохраняется; верная уходит числами', async () => {
    const submit = vi.fn(async () => {})
    const w = mountModal({ weightColumn: true, currentWeight: 90.5 }, submit)
    await w.find('[data-test="new-goal-name"]').setValue('Сбросить')
    await w.find('[data-test="goal-kind-select"]').setValue('lose')
    expect((w.find('[data-test="goal-weight-start"]').element as HTMLInputElement).value).toBe('90,5')
    await w.find('[data-test="goal-weight-target"]').setValue('95')
    await w.find('[data-test="goal-form-save"]').trigger('click')
    expect(submit).not.toHaveBeenCalled()
    expect(w.find('[data-test="goal-form-error"]').text()).toMatch(/lower|ниже/)
    await w.find('[data-test="goal-weight-target"]').setValue('82,5')
    await w.find('[data-test="goal-form-save"]').trigger('click')
    await Promise.resolve()
    expect(saved(submit)).toMatchObject({ weightMode: 'lose', weightStart: 90.5, weightTarget: 82.5 })
    w.unmount()
  })
})
