import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import WeekStreak from './WeekStreak.vue'
import { addDaysIso, todayStr } from '../lib/date'
import type { WorkoutEntry } from '../lib/types'

const en = (ago: number): WorkoutEntry => ({ id: 'e' + ago, user_id: 'u', exercise_id: 'x', date: addDaysIso(todayStr(), -ago), sets: [{ reps: 5, weight: null, time: null, duration: null, side: null }], notes: null })
beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
})

describe('WeekStreak', () => {
  it('без записей блока нет', () => {
    expect(mount(WeekStreak, { props: { entries: [] } }).find('[data-testid="week-streak"]').exists()).toBe(false)
  })
  it('показывает серию, лучшую серию, дни недели и 8 столбиков', () => {
    const w = mount(WeekStreak, { props: { entries: [en(0), en(7), en(14)] } })
    expect(w.find('[data-testid="streak-current"]').text()).toBe('3')
    expect(w.find('[data-testid="streak-best"]').text()).toBe('3')
    expect(w.find('[data-testid="streak-week"]').text()).toBe('1')
    expect(w.findAll('[data-testid="streak-bars"] span')).toHaveLength(8)
    expect(w.findAll('[data-testid="streak-bars"] span[data-days="1"]')).toHaveLength(3)
  })
})
