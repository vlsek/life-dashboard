import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import BodyModelPicker from './components/BodyModelPicker.vue'
import { BODY_MODELS } from './lib/bodyModel'

// Раздел «Модель тела» (BACKLOG 59.2): «По полу профиля» + пять моделей, выбор — тот же ключ localStorage, что у «Тренировок».
beforeEach(() => localStorage.clear())

describe('BodyModelPicker', () => {
  it('плитки: «По полу» и пять моделей, у каждой своё превью; по умолчанию выбрано «По полу»', () => {
    const w = mount(BodyModelPicker)
    for (const v of ['auto', ...BODY_MODELS]) {
      expect(w.find(`[data-testid="bodymodel-${v}"] [data-testid="bodymodel-preview"]`).exists(), v).toBe(true)
    }
    expect(w.find('[data-testid="bodymodel-auto"]').attributes('data-active')).toBe('true')
    const outlines = new Set(BODY_MODELS.map((v) => w.find(`[data-testid="bodymodel-${v}"] path`).attributes('d')))
    expect(outlines.size).toBe(BODY_MODELS.length)
  })

  it('выбор пишется в workouts_body_model, «По полу» его убирает', async () => {
    const w = mount(BodyModelPicker)
    await w.find('[data-testid="bodymodel-chibi"] [data-testid="bodymodel-choose"]').trigger('click')
    expect(localStorage.getItem('workouts_body_model')).toBe('chibi')
    expect(w.find('[data-testid="bodymodel-chibi"]').attributes('data-active')).toBe('true')
    await w.find('[data-testid="bodymodel-auto"] [data-testid="bodymodel-choose"]').trigger('click')
    expect(localStorage.getItem('workouts_body_model')).toBeNull()
  })

  it('запомненный выбор подсвечен при открытии', () => {
    localStorage.setItem('workouts_body_model', 'stocky')
    const w = mount(BodyModelPicker)
    expect(w.find('[data-testid="bodymodel-stocky"]').attributes('data-active')).toBe('true')
  })
})
