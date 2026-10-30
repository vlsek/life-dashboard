import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CustomChallengeForm from './CustomChallengeForm.vue'

// BACKLOG 76.7: чипы 7 / 30 / 100 дней под полем длительности
describe('CustomChallengeForm: быстрый выбор длительности', () => {
  it('нажатие на чип подставляет число дней в поле и в сохраняемый результат', async () => {
    const w = mount(CustomChallengeForm, { props: { metrics: [], exercises: [] } })
    expect(w.find('[data-testid="duration-chips"]').exists()).toBe(true)
    await w.get('[data-testid="duration-chip-7"]').trigger('click')
    expect((w.get('input[type="number"]').element as HTMLInputElement).value).toBe('7')
    expect(w.get('[data-testid="duration-chip-7"]').attributes('aria-pressed')).toBe('true')
    expect(w.get('[data-testid="duration-chip-30"]').attributes('aria-pressed')).toBe('false')
    await w.get('[data-testid="duration-chip-100"]').trigger('click')
    expect((w.get('input[type="number"]').element as HTMLInputElement).value).toBe('100')
  })
  it('значения 7, 30 и 100 — ровно три чипа', () => {
    const w = mount(CustomChallengeForm, { props: { metrics: [], exercises: [] } })
    expect(w.findAll('[data-testid^="duration-chip-"]').map((b) => b.attributes('data-testid'))).toEqual(['duration-chip-7', 'duration-chip-30', 'duration-chip-100'])
  })
})
