import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import TodayFocus from './components/TodayFocus.vue'
import type { Exercise } from './lib/types'

// BACKLOG 80.4: у каждой группы в «Что тренировать сегодня» — кнопка «Выбрать упражнения» (фильтр списка по этой мышце).
beforeEach(() => localStorage.setItem('site_lang', 'ru'))
const ex = (id: string, name: string, muscle: string): Exercise => ({ id, name, muscle_group: muscle, unit: 'reps' }) as unknown as Exercise

describe('«Что тренировать сегодня»: начать по группе', () => {
  it('кнопка отдаёт мышцу группы', async () => {
    const w = mount(TodayFocus, { props: { entries: [], exercises: [ex('1', 'Подтягивания', 'back'), ex('2', 'Жим', 'chest')], today: '2026-11-08' } })
    const items = w.findAll('[data-testid="focus-item"]')
    expect(items.length).toBeGreaterThan(0)
    const btn = items[0].get('[data-testid="focus-start"]')
    expect(btn.attributes('aria-label')).toContain('Выбрать упражнения')
    await btn.trigger('click')
    const ev = w.emitted('pick')!
    expect(ev).toHaveLength(1)
    expect(['back', 'chest']).toContain(ev[0][0])
  })
  it('без упражнений блока нет', () => {
    const w = mount(TodayFocus, { props: { entries: [], exercises: [], today: '2026-11-08' } })
    expect(w.find('[data-testid="today-focus"]').exists()).toBe(false)
  })
})
