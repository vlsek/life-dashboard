import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import GoalForm from './components/GoalForm.vue'
import type { GoalFormInitial, GoalFormInput } from './lib/types'

// BACKLOG разделы 35/40 (решение владельца 2026-10-06): баллы за цель не вводятся вручную — их задаёт сложность (5 / 10 / 15).
beforeEach(() => localStorage.setItem('site_lang', 'ru'))

const base: GoalFormInitial = { name: '', points: 5, category: '', stages: 1, difficulty: null, deadline: '' }
function mountForm(initial: Partial<GoalFormInitial> = {}, isEdit = false, submit: (r: GoalFormInput) => Promise<void> = async () => {}) {
  return mount(GoalForm, { props: { isEdit, initial: { ...base, ...initial }, submit }, attachTo: document.body })
}
const hint = (w: ReturnType<typeof mount>) => w.find('[data-test="goal-points-auto"]').text()
const diffSelect = (w: ReturnType<typeof mount>) => w.findAll('select')[1] // первый — категория, второй — сложность

describe('форма цели: баллы по сложности', () => {
  it('поля «Баллы» нет — ни подписи, ни числового поля баллов', () => {
    const w = mountForm()
    const labels = w.findAll('label').map((l) => l.text())
    expect(labels).toEqual(['Название', 'Категория', 'Количество этапов (1 = обычная галочка)', 'Сложность', 'Дедлайн (необязательно)'])
    expect(w.findAll('input[type="number"]')).toHaveLength(1) // только этапы
    w.unmount()
  })

  it('строка «Баллы» следует за сложностью: не задана 5, лёгкая 5, средняя 10, сложная 15', async () => {
    const w = mountForm()
    expect(hint(w)).toContain('Баллы за выполнение: 5')
    for (const [value, pts] of [['hard', 15], ['medium', 10], ['easy', 5]] as const) {
      await diffSelect(w).setValue(value)
      expect(hint(w)).toContain(`Баллы за выполнение: ${pts}`)
    }
    await diffSelect(w).setValue(null as never)
    expect(hint(w)).toContain('Баллы за выполнение: 5')
    w.unmount()
  })

  it('на английском тоже, шкала названа в подсказке', () => {
    localStorage.setItem('site_lang', 'en')
    const w = mountForm()
    expect(hint(w)).toBe('Points for completion: 5 (set by difficulty: easy 5, medium 10, hard 15)')
    w.unmount()
  })

  it('«Сохранить» отдаёт название, категорию, этапы, сложность, дедлайн — без points', async () => {
    const submit = vi.fn(async () => {})
    const w = mountForm({}, false, submit)
    await w.find('input[type="text"]').setValue('Пробежать 10 км')
    await diffSelect(w).setValue('hard')
    await w.find('[data-test="goal-form-save"]').trigger('click')
    await Promise.resolve()
    expect(submit).toHaveBeenCalledTimes(1)
    const res = (submit.mock.calls[0] as unknown as [GoalFormInput])[0]
    expect(res).toEqual({ name: 'Пробежать 10 км', category: '', stages: 1, difficulty: 'hard', deadline: '' })
    expect(res).not.toHaveProperty('points')
    w.unmount()
  })

  it('правка старой цели с «чужими» баллами: показаны её баллы, пока сложность не меняли', async () => {
    const w = mountForm({ name: 'Старая', points: 50, difficulty: null }, true)
    expect(hint(w)).toContain('Баллы за выполнение: 50')
    await diffSelect(w).setValue('medium')
    expect(hint(w)).toContain('Баллы за выполнение: 10')
    await diffSelect(w).setValue(null as never)
    expect(hint(w)).toContain('Баллы за выполнение: 50') // вернули прежнюю сложность — прежние баллы
    w.unmount()
  })
})
