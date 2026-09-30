import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CustomChallengeForm from './CustomChallengeForm.vue'
import DailyChallengeCard from './DailyChallengeCard.vue'
import CumulativeChallengeCard from './CumulativeChallengeCard.vue'
import type { Challenge } from '../lib/types'

const ch = (over: Partial<Challenge> = {}): Challenge => ({
  id: 'c1', user_id: 'u', template_id: null, title: 'Отжимания', icon: '💪', type: 'daily_fixed', unit: 'раз', start_date: '2026-09-01',
  duration_days: 30, daily_target: 20, start_value: null, daily_increment: null, target_count: null, item_label: null,
  active: true, completed: false, completed_at: null, created_at: '2026-09-01T00:00:00Z', ...over,
})

beforeEach(() => localStorage.setItem('site_lang', 'ru'))

describe('CustomChallengeForm — режим правки', () => {
  it('создание: пустая форма, тип можно выбрать, заголовок «Свой челлендж»', () => {
    const w = mount(CustomChallengeForm)
    expect(w.find('h3').text()).toBe('Свой челлендж')
    expect((w.find('input[type="text"]').element as HTMLInputElement).value).toBe('')
    expect(w.find('[data-testid="type-select"]').attributes('disabled')).toBeUndefined()
    expect(w.find('[data-testid="type-locked-hint"]').exists()).toBe(false)
  })

  it('правка: поля заполнены значениями челленджа, тип заблокирован с пояснением', () => {
    const w = mount(CustomChallengeForm, { props: { challenge: ch() } })
    expect(w.find('h3').text()).toBe('Править челлендж')
    const inputs = w.findAll('input')
    expect((inputs[0].element as HTMLInputElement).value).toBe('Отжимания')
    expect((inputs[1].element as HTMLInputElement).value).toBe('💪')
    expect((w.find('[data-testid="type-select"]').element as HTMLSelectElement).value).toBe('daily_fixed')
    expect(w.find('[data-testid="type-select"]').attributes('disabled')).toBeDefined()
    expect(w.find('[data-testid="type-locked-hint"]').exists()).toBe(true)
  })

  it('правка: сохранение отдаёт изменённые значения вместе с неизменёнными', async () => {
    const w = mount(CustomChallengeForm, { props: { challenge: ch() } })
    await w.findAll('input')[0].setValue('Отжимания 2.0')
    await w.findAll('input')[3].setValue('40') // цель на день (поле включено для daily_fixed)
    await w.find('.modal-actions button:not(.secondary)').trigger('click')
    const saved = w.emitted('save')?.[0][0] as Record<string, unknown>
    expect(saved).toMatchObject({ title: 'Отжимания 2.0', type: 'daily_fixed', dailyTarget: 40, duration: 30, unit: 'раз' })
  })

  it('правка: пустое название не сохраняется', async () => {
    const w = mount(CustomChallengeForm, { props: { challenge: ch() } })
    await w.findAll('input')[0].setValue('   ')
    await w.find('.modal-actions button:not(.secondary)').trigger('click')
    expect(w.emitted('save')).toBeUndefined()
  })

  it('правка накопительного челленджа: включены только его поля', () => {
    const w = mount(CustomChallengeForm, { props: { challenge: ch({ type: 'cumulative_count', duration_days: null, daily_target: null, target_count: 12, item_label: 'книга' }) } })
    const inputs = w.findAll('input')
    const enabled = inputs.filter((i) => i.attributes('disabled') === undefined).length
    // название, иконка, единица, цель по количеству, подпись предмета
    expect(enabled).toBe(5)
  })
})

describe('Кнопка «Править» на карточках', () => {
  it('ежедневный челлендж: клик отдаёт этот челлендж', async () => {
    const c = ch()
    const w = mount(DailyChallengeCard, { props: { challenge: c, entries: [] } })
    await w.find('[data-testid="edit-challenge"]').trigger('click')
    expect(w.emitted('edit')?.[0]).toEqual([c])
  })
  it('накопительный челлендж: клик отдаёт этот челлендж', async () => {
    const c = ch({ type: 'cumulative_count', duration_days: null, daily_target: null, target_count: 12, item_label: 'книга' })
    const w = mount(CumulativeChallengeCard, { props: { challenge: c, entries: [] } })
    await w.find('[data-testid="edit-challenge"]').trigger('click')
    expect(w.emitted('edit')?.[0]).toEqual([c])
  })
})
