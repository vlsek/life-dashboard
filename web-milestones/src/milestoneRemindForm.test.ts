import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import MilestoneFormModal from './components/MilestoneFormModal.vue'

// BACKLOG 76.6: поле «напомнить за … дней» в форме вехи уходит в submit; у существующей вехи подставляется её значение.
describe('форма вехи: напомнить за N дней', () => {
  it('новая веха: пусто → null-подобное значение, введённое число уходит в submit', async () => {
    const w = mount(MilestoneFormModal, { props: { existing: null } })
    await w.find('input[type="text"]').setValue('Масло')
    expect((w.find('[data-test="remind-days"]').element as HTMLInputElement).value).toBe('')
    await w.find('[data-test="remind-days"]').setValue('21')
    await w.find('form').trigger('submit')
    const sub = w.emitted('submit')![0][0] as { remind_days?: unknown }
    expect(Number(sub.remind_days)).toBe(21)
  })
  it('существующая веха показывает свой порог', () => {
    const existing = { id: '1', user_id: 'u', name: 'Фильтр', category: '', last_date: null, interval_value: null, interval_unit: null, due_date: '2026-12-01', last_km: null, interval_km: null, note: null, remind_days: 30, history: [], done: false, created_at: '' }
    const w = mount(MilestoneFormModal, { props: { existing } as never })
    expect((w.find('[data-test="remind-days"]').element as HTMLInputElement).value).toBe('30')
  })
})
