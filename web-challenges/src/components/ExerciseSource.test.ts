import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CustomChallengeForm from './CustomChallengeForm.vue'
import DailyChallengeCard from './DailyChallengeCard.vue'
import type { Challenge, ChallengeEntry, SourceExercise, SourceMetric } from '../lib/types'

const ch = (over: Partial<Challenge> = {}): Challenge => ({
  id: 'c1', user_id: 'u', template_id: null, title: 'Отжимания', icon: '💪', type: 'daily_fixed', unit: 'раз', start_date: '2020-01-01',
  duration_days: 30, daily_target: 20, start_value: null, daily_increment: null, target_count: null, item_label: null,
  active: true, completed: false, completed_at: null, created_at: '2020-01-01T00:00:00Z', ...over,
})
const metrics: SourceMetric[] = [{ id: 'm1', name: 'Отжимания', icon: null, type: 'sets', unit: 'раз' }]
const exercises: SourceExercise[] = [
  { id: 'e1', name: 'Подтягивания', category: 'Спина', unit: 'кг' },
  { id: 'e2', name: 'Приседания', category: null, unit: 'кг' },
]

beforeEach(() => localStorage.setItem('site_lang', 'ru'))

describe('CustomChallengeForm — упражнение как источник', () => {
  it('lists exercises in their own group and emits sourceExerciseId (not the metric)', async () => {
    const w = mount(CustomChallengeForm, { props: { metrics, exercises } })
    const sel = w.find('[data-testid="source-select"]')
    expect(sel.findAll('optgroup').map((g) => g.attributes('label'))).toEqual(['Метрики', 'Упражнения из тренировок (сумма повторов)'])
    await w.findAll('input')[0].setValue('Подтягивания 30 дней')
    await sel.setValue('ex:e1')
    await w.find('.modal-actions button:not(.secondary)').trigger('click')
    const saved = w.emitted('save')?.[0]?.[0] as { sourceMetricId: string; sourceExerciseId: string }
    expect(saved.sourceExerciseId).toBe('e1')
    expect(saved.sourceMetricId).toBe('')
  })
  it('a metric choice still emits only sourceMetricId', async () => {
    const w = mount(CustomChallengeForm, { props: { metrics, exercises } })
    await w.findAll('input')[0].setValue('x')
    await w.find('[data-testid="source-select"]').setValue('m1')
    await w.find('.modal-actions button:not(.secondary)').trigger('click')
    const saved = w.emitted('save')?.[0]?.[0] as { sourceMetricId: string; sourceExerciseId: string }
    expect(saved.sourceMetricId).toBe('m1')
    expect(saved.sourceExerciseId).toBe('')
  })
  it('shows the select when there are only exercises (no metrics)', () => {
    const w = mount(CustomChallengeForm, { props: { exercises } })
    expect(w.find('[data-testid="source-select"]').exists()).toBe(true)
    expect(w.findAll('optgroup')).toHaveLength(1)
  })
  it('without exercises (before migration 042) the select is the old flat metric list', () => {
    const w = mount(CustomChallengeForm, { props: { metrics } })
    expect(w.findAll('optgroup')).toHaveLength(0)
    expect(w.find('[data-testid="source-select"]').findAll('option').map((o) => o.text())).toEqual(['Вводить вручную', 'Отжимания (раз)'])
  })
  it('edit: preselects the current exercise; a deleted exercise stays selectable as a placeholder', () => {
    const w = mount(CustomChallengeForm, { props: { challenge: ch({ source_exercise_id: 'e2' }), metrics, exercises } })
    expect((w.find('[data-testid="source-select"]').element as HTMLSelectElement).value).toBe('ex:e2')
    const gone = mount(CustomChallengeForm, { props: { challenge: ch({ source_exercise_id: 'e404' }), metrics, exercises } })
    expect((gone.find('[data-testid="source-select"]').element as HTMLSelectElement).value).toBe('ex:e404')
  })
})

describe('DailyChallengeCard — значения из тренировок', () => {
  const workoutEntry = (date: string, value: number): ChallengeEntry => ({ id: `metric:c1:${date}`, user_id: 'u', challenge_id: 'c1', date, value, note: null, created_at: '' })

  it('badge says "из тренировок" with the exercise name; the metric badge is unchanged', () => {
    const w = mount(DailyChallengeCard, { props: { challenge: ch({ source_exercise_id: 'e1' }), entries: [], sourceName: 'Подтягивания' } })
    const text = w.find('[data-testid="source-badge"]').text()
    expect(text).toContain('из тренировок')
    expect(text).toContain('Подтягивания')
    const m = mount(DailyChallengeCard, { props: { challenge: ch({ source_metric_id: 'm1' }), entries: [], sourceName: 'Отжимания' } })
    expect(m.find('[data-testid="source-badge"]').text()).toContain('из метрики')
  })
  it('past day taken from workouts shows the workout replace-hint', async () => {
    const w = mount(DailyChallengeCard, { props: { challenge: ch({ source_exercise_id: 'e1' }), entries: [workoutEntry('2020-01-02', 25)] } })
    await w.find('[data-day="2020-01-02"]').trigger('click')
    expect(w.find('[data-testid="day-from-metric"]').text()).toContain('из тренировок')
    expect((w.find('[data-testid="day-value"]').element as HTMLInputElement).value).toBe('25')
  })
})
