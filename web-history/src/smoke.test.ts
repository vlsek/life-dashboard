import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import DayDetailModal from './components/DayDetailModal.vue'
import type { HistoryContext } from './lib/stats'
import type { Metric } from './lib/types'

const mA: Metric = { id: 'A', name: 'Зарядка', icon: '🏃', type: 'boolean' }
const mB: Metric = { id: 'B', name: 'Вода', icon: '💧', type: 'number', goal_value: 2000, unit: 'мл' }
const mSets: Metric = { id: 'S', name: 'Отжимания', icon: '💪', type: 'sets' }

const ctx: HistoryContext = {
  metrics: [mA, mB, mSets],
  byDate: {
    '2026-09-23': {
      A: true,
      B: 2500,
      S: [
        { reps: 10, time: '08:00' },
        { reps: 8, time: '08:05' },
      ],
    },
  },
  notesByDate: {
    '2026-09-23': {
      date: '2026-09-23',
      items: ['Сходил на пробежку'],
      planned_goals: [{ type: 'custom', text: 'Купить билеты', done: false }],
    },
  },
  goals: [],
  settings: { enabled: true, includePlanned: true, includeMetrics: true, dayPlace: 'avatar', weekPlace: 'profile' },
  firstDate: '2026-09-20',
  today: '2026-09-24',
}

describe('DayDetailModal', () => {
  it('renders a day with data: 75% (planned item unfinished lowers it from 100%), metric name, summed reps, set times, note, unfinished plan', () => {
    const wrapper = mount(DayDetailModal, { props: { ctx, dateStr: '2026-09-23' } })
    const html = wrapper.html()
    expect(html).toContain('75%')
    expect(html).toContain('Отжимания')
    expect(html).toContain('18') // 10 + 8 повторений
    expect(html).toContain('08:00')
    expect(html).toContain('Сходил на пробежку')
    expect(html).toContain('Купить билеты')
    wrapper.unmount()
  })

  it('renders a day with no data without throwing', () => {
    const wrapper = mount(DayDetailModal, { props: { ctx, dateStr: '2026-09-10' } })
    expect(wrapper.html().length).toBeGreaterThan(0)
    wrapper.unmount()
  })

  it('renders a future day without throwing', () => {
    const wrapper = mount(DayDetailModal, { props: { ctx, dateStr: '2026-09-30' } })
    expect(wrapper.html().length).toBeGreaterThan(0)
    wrapper.unmount()
  })
})
