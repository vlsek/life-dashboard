import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import GoalCard from './components/GoalCard.vue'
import GoalForm from './components/GoalForm.vue'
import { buildInsertRow, buildUpdateRow } from './lib/goals'
import { parseWeight, validateWeight, weightFields, weightProgress, weightSpecOf } from './lib/weightGoal'
import type { Goal, GoalFormInitial, GoalFormInput } from './lib/types'

const goal = (o: Partial<Goal> = {}): Goal => ({
  id: 'g1', user_id: 'u', name: 'Сбросить', points: 10, category: 'Тело', stages: 1, current_stage: 0,
  done: false, done_date: null, deadline: null, difficulty: 'medium', created_at: '2026-10-01',
  weight_mode: 'lose', weight_start: 90, weight_target: 80, ...o,
})
const form = (o: Partial<GoalFormInput> = {}): GoalFormInput => ({ name: 'Цель', category: '', stages: 1, difficulty: null, deadline: '', ...o })

describe('цели на вес: логика', () => {
  it('parseWeight: запятая, округление до 0,1, диапазон 20–500', () => {
    expect(parseWeight('82,46')).toBe(82.5)
    expect(parseWeight(' 70.04 ')).toBe(70)
    for (const bad of ['', 'abc', '19,9', '501', null, undefined, '12']) expect(parseWeight(bad as string)).toBeNull()
  })
  it('weightSpecOf: нужны режим и оба числа', () => {
    expect(weightSpecOf(goal())).toEqual({ mode: 'lose', start: 90, target: 80 })
    expect(weightSpecOf(goal({ weight_mode: null }))).toBeNull()
    expect(weightSpecOf(goal({ weight_target: null }))).toBeNull()
    expect(weightSpecOf({})).toBeNull()
  })
  it('validateWeight: «сбросить» — цель ниже старта, «набрать» — выше', () => {
    expect(validateWeight('lose', 90, 80)).toBe('ok')
    expect(validateWeight('lose', 90, 95)).toBe('direction')
    expect(validateWeight('lose', 90, 90)).toBe('direction')
    expect(validateWeight('gain', 60, 70)).toBe('ok')
    expect(validateWeight('gain', 60, 55)).toBe('direction')
    expect(validateWeight('gain', null, 70)).toBe('start')
    expect(validateWeight('gain', 60, null)).toBe('target')
  })
  it('weightProgress: сброс', () => {
    const s = { mode: 'lose' as const, start: 90, target: 80 }
    expect(weightProgress(s, null)).toEqual({ pct: 0, reached: false, left: 10, current: 90 })
    expect(weightProgress(s, 85)).toMatchObject({ pct: 50, reached: false, left: 5 })
    expect(weightProgress(s, 79.5)).toMatchObject({ pct: 100, reached: true, left: 0 })
    expect(weightProgress(s, 95)).toMatchObject({ pct: 0, reached: false, left: 15 }) // вес ушёл не туда — прогресс не отрицательный
  })
  it('weightProgress: набор', () => {
    const s = { mode: 'gain' as const, start: 60, target: 70 }
    expect(weightProgress(s, 63)).toMatchObject({ pct: 30, reached: false, left: 7 })
    expect(weightProgress(s, 70)).toMatchObject({ pct: 100, reached: true })
    expect(weightProgress(s, 58)).toMatchObject({ pct: 0, reached: false, left: 12 })
  })
})

describe('цели на вес: запись в базу', () => {
  const w = { weightMode: 'lose' as const, weightStart: 90, weightTarget: 80 }
  it('с колонками — вес уходит в строку, этапы сбрасываются в 1', () => {
    const row = buildInsertRow(form({ ...w, stages: 5 }), 'Без', { weightColumn: true })
    expect(row).toMatchObject({ weight_mode: 'lose', weight_start: 90, weight_target: 80, stages: 1 })
    const patch = buildUpdateRow(form({ ...w, stages: 5 }), goal(), 'Без', { weightColumn: true })
    expect(patch).toMatchObject({ weight_mode: 'lose', weight_start: 90, weight_target: 80, stages: 1 })
  })
  it('обычная цель при наличии колонок обнуляет вес; без колонок поля вообще не пишутся (миграция 085 не применена)', () => {
    expect(buildUpdateRow(form(), goal(), 'Без', { weightColumn: true })).toMatchObject({ weight_mode: null, weight_start: null, weight_target: null })
    expect(buildInsertRow(form(w), 'Без')).not.toHaveProperty('weight_mode')
    expect(weightFields(w, false)).toEqual({})
  })
})

describe('GoalCard: цель на вес', () => {
  const mountCard = (o: Partial<Goal> = {}, bodyWeight: number | null = 85) => mount(GoalCard, { props: { goal: goal(o), bodyWeight } })
  it('показывает процент, диапазон, текущий вес и «осталось»; вместо галочки — кольцо процента', () => {
    const w = mountCard()
    expect(w.find('[data-test="goal-weight-percent"]').text()).toBe('50%')
    expect(w.find('[data-test="goal-check"]').exists()).toBe(false)
    expect(w.find('[data-test="goal-weight-range"]').text()).toMatch(/^90 → 80 (kg|кг)$/)
    expect(w.find('[data-test="goal-weight-current"]').text()).toContain('85')
    expect(w.find('[data-test="goal-weight-left"]').text()).toContain('5')
  })
  it('достигнута — вместо «осталось» надпись; нет измерения — считается от старта и текущий вес не показывается', () => {
    expect(mountCard({}, 79).find('[data-test="goal-weight-reached"]').exists()).toBe(true)
    const w = mountCard({}, null)
    expect(w.find('[data-test="goal-weight-current"]').exists()).toBe(false)
    expect(w.find('[data-test="goal-weight-percent"]').text()).toBe('0%')
  })
  it('«Записать вес» шлёт число (запятая допустима) и очищает поле; мусор — ошибка и ничего не шлёт', async () => {
    const w = mountCard()
    await w.find('[data-test="goal-weight-input"]').setValue('84,5')
    await w.find('[data-test="goal-weight-log"]').trigger('click')
    expect(w.emitted('weight')).toEqual([[84.5]])
    expect((w.find('[data-test="goal-weight-input"]').element as HTMLInputElement).value).toBe('')
    await w.find('[data-test="goal-weight-input"]').setValue('5')
    await w.find('[data-test="goal-weight-log"]').trigger('click')
    expect(w.emitted('weight')).toHaveLength(1)
    expect(w.find('[data-test="goal-weight-bad"]').exists()).toBe(true)
  })
  it('обычная цель без веса выглядит как раньше', () => {
    const w = mountCard({ weight_mode: null, weight_start: null, weight_target: null })
    expect(w.find('[data-test="goal-weight"]').exists()).toBe(false)
    expect(w.find('[data-test="goal-check"]').exists()).toBe(true)
  })
})

describe('форма цели: вес', () => {
  const base: GoalFormInitial = { name: 'Цель', points: 5, category: '', stages: 1, difficulty: null, deadline: '' }
  const mountForm = (props: { weightColumn?: boolean; currentWeight?: number | null; initial?: Partial<GoalFormInitial> }, submit: (r: GoalFormInput) => Promise<void> = async () => {}) =>
    mount(GoalForm, { props: { isEdit: false, initial: { ...base, ...props.initial }, weightColumn: props.weightColumn ?? false, currentWeight: props.currentWeight ?? null, submit }, attachTo: document.body })

  it('выбор типа есть только при колонках (или у уже весовой цели)', () => {
    const a = mountForm({})
    expect(a.find('[data-test="goal-kind-select"]').exists()).toBe(false)
    a.unmount()
    const b = mountForm({ weightColumn: true })
    expect(b.find('[data-test="goal-kind-select"]').exists()).toBe(true)
    b.unmount()
    const c = mountForm({ initial: { weightMode: 'gain', weightStart: 60, weightTarget: 70 } })
    expect(c.find('[data-test="goal-kind-select"]').exists()).toBe(true)
    expect((c.find('[data-test="goal-weight-target"]').element as HTMLInputElement).value).toBe('70')
    c.unmount()
  })
  it('старт по умолчанию — последний вес тела; цель не в ту сторону не сохраняется и объясняется', async () => {
    const submit = vi.fn(async () => {})
    const w = mountForm({ weightColumn: true, currentWeight: 90.5 }, submit)
    await w.find('[data-test="goal-kind-select"]').setValue('lose')
    expect((w.find('[data-test="goal-weight-start"]').element as HTMLInputElement).value).toBe('90,5')
    await w.find('[data-test="goal-weight-target"]').setValue('95')
    await w.find('[data-test="goal-form-save"]').trigger('click')
    expect(submit).not.toHaveBeenCalled()
    expect(w.find('[data-test="goal-form-error"]').text()).toMatch(/lower|ниже/)
    await w.find('[data-test="goal-weight-target"]').setValue('82,5')
    await w.find('[data-test="goal-form-save"]').trigger('click')
    await Promise.resolve()
    expect((submit.mock.calls[0] as unknown as [GoalFormInput])[0]).toMatchObject({ weightMode: 'lose', weightStart: 90.5, weightTarget: 82.5 })
    w.unmount()
  })
  it('обычная цель не шлёт ключей веса', async () => {
    const submit = vi.fn(async () => {})
    const w = mountForm({ weightColumn: true }, submit)
    await w.find('[data-test="goal-form-save"]').trigger('click')
    await Promise.resolve()
    expect((submit.mock.calls[0] as unknown as [GoalFormInput])[0]).not.toHaveProperty('weightMode')
    w.unmount()
  })
})
