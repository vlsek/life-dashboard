import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CustomChallengeForm from './CustomChallengeForm.vue'
import DailyChallengeCard from './DailyChallengeCard.vue'
import type { Challenge, ChallengeEntry, SourceMetric } from '../lib/types'

const ch = (over: Partial<Challenge> = {}): Challenge => ({
  id: 'c1', user_id: 'u', template_id: null, title: 'Отжимания', icon: '💪', type: 'daily_fixed', unit: 'раз', start_date: '2026-09-01',
  duration_days: 30, daily_target: 20, start_value: null, daily_increment: null, target_count: null, item_label: null,
  active: true, completed: false, completed_at: null, created_at: '2026-09-01T00:00:00Z', ...over,
})
const metrics: SourceMetric[] = [
  { id: 'm1', name: 'Отжимания', icon: '💪', type: 'sets', unit: 'раз' },
  { id: 'm2', name: 'Зарядка', icon: null, type: 'boolean', unit: null },
]

beforeEach(() => localStorage.setItem('site_lang', 'ru'))

describe('CustomChallengeForm — источник значений', () => {
  it('shows the source select for daily challenges when the user has metrics, and emits the chosen metric', async () => {
    const w = mount(CustomChallengeForm, { props: { metrics } })
    const sel = w.find('[data-testid="source-select"]')
    expect(sel.exists()).toBe(true)
    expect(sel.findAll('option').map((o) => o.text())).toEqual(['Вводить вручную', '💪 Отжимания (раз)', 'Зарядка'])
    await w.findAll('input')[0].setValue('Мой челлендж')
    await sel.setValue('m1')
    await w.find('.modal-actions button:not(.secondary)').trigger('click')
    expect((w.emitted('save')?.[0]?.[0] as { sourceMetricId: string }).sourceMetricId).toBe('m1')
  })
  it('is hidden without metrics and for cumulative challenges', async () => {
    expect(mount(CustomChallengeForm).find('[data-testid="source-select"]').exists()).toBe(false)
    const w = mount(CustomChallengeForm, { props: { metrics } })
    await w.find('[data-testid="type-select"]').setValue('cumulative_count')
    expect(w.find('[data-testid="source-select"]').exists()).toBe(false)
  })
  it('edit: preselects the current source', () => {
    const w = mount(CustomChallengeForm, { props: { challenge: ch({ source_metric_id: 'm2' }), metrics } })
    expect((w.find('[data-testid="source-select"]').element as HTMLSelectElement).value).toBe('m2')
  })
})

describe('DailyChallengeCard — значения из метрики', () => {
  const metricEntry = (date: string, value: number): ChallengeEntry => ({ id: `metric:c1:${date}`, user_id: 'u', challenge_id: 'c1', date, value, note: null, created_at: '' })

  it('shows the badge with the metric name', () => {
    const w = mount(DailyChallengeCard, { props: { challenge: ch({ source_metric_id: 'm1' }), entries: [], sourceName: 'Отжимания' } })
    expect(w.find('[data-testid="source-badge"]').text()).toContain('из метрики')
    expect(w.find('[data-testid="source-badge"]').text()).toContain('Отжимания')
  })
  it('no badge for a manual challenge', () => {
    const w = mount(DailyChallengeCard, { props: { challenge: ch(), entries: [] } })
    expect(w.find('[data-testid="source-badge"]').exists()).toBe(false)
  })
  it('shows the replace-hint for a past day taken from the metric, not for a manual day', async () => {
    const w = mount(DailyChallengeCard, { props: { challenge: ch({ start_date: '2020-01-01', source_metric_id: 'm1' }), entries: [metricEntry('2020-01-02', 20)] } })
    await w.find('[data-day="2020-01-02"]').trigger('click')
    expect(w.find('[data-testid="day-from-metric"]').exists()).toBe(true)
    expect((w.find('[data-testid="day-value"]').element as HTMLInputElement).value).toBe('20')
    await w.find('[data-day="2020-01-03"]').trigger('click')
    expect(w.find('[data-testid="day-from-metric"]').exists()).toBe(false)
  })
})
