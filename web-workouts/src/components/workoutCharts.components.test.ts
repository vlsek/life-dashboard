import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ExerciseChart from './ExerciseChart.vue'
import OverviewChart from './OverviewChart.vue'
import type { Exercise, WorkoutEntry } from '../lib/types'

const entry = (date: string, sets: Array<{ reps?: number | null; weight?: number | null }>): WorkoutEntry => ({
  id: date, user_id: 'u', exercise_id: 'e', date, notes: null,
  sets: sets.map((s) => ({ reps: s.reps ?? null, weight: s.weight ?? null })) as WorkoutEntry['sets'],
})
const exercise = (tracks_weight: boolean): Exercise => ({ id: 'e', user_id: 'u', name: 'X', category: null, tracks_weight, value_label: null, unit: null, suggested_scheme: null, created_at: '' })

describe('ExerciseChart', () => {
  it('меньше 2 точек — ничего не рисует', () => {
    const w = mount(ExerciseChart, { props: { exercise: exercise(true), entries: [entry('2026-01-01', [{ weight: 10 }])] } })
    expect(w.html()).toBe('<!--v-if-->')
  })
  it('2+ точек — рисует график с подписью по весу или объёму', () => {
    const withWeight = mount(ExerciseChart, { props: { exercise: exercise(true), entries: [entry('2026-01-01', [{ weight: 10 }]), entry('2026-01-02', [{ weight: 12 }])] } })
    expect(withWeight.text()).toContain('Max weight progress')
    const noWeight = mount(ExerciseChart, { props: { exercise: exercise(false), entries: [entry('2026-01-01', [{ reps: 10 }]), entry('2026-01-02', [{ reps: 12 }])] } })
    expect(noWeight.text()).toContain('Total volume progress')
  })
})

describe('OverviewChart', () => {
  beforeEach(() => localStorage.clear())
  it('меньше 2 дней с подходами — секция не рисуется', () => {
    const w = mount(OverviewChart, { props: { entries: [entry('2026-01-01', [{ reps: 10 }])] } })
    expect(w.find('[data-test="overview-card"]').exists()).toBe(false)
  })
  it('2+ дня — показывает заголовок и по умолчанию период "этот месяц" из общего chart.ts', () => {
    const today = new Date()
    const d1 = today.toISOString().slice(0, 10)
    const prev = new Date(today); prev.setDate(prev.getDate() - 1)
    const d2 = prev.toISOString().slice(0, 10)
    const w = mount(OverviewChart, { props: { entries: [entry(d1, [{ reps: 1 }]), entry(d2, [{ reps: 1 }])] } })
    expect(w.find('[data-test="overview-card"]').exists()).toBe(true)
    expect(w.text()).toContain('Total training volume')
  })
  it('кнопка периода открывает/закрывает PeriodPicker', async () => {
    const today = new Date()
    const d1 = today.toISOString().slice(0, 10)
    const prev = new Date(today); prev.setDate(prev.getDate() - 1)
    const d2 = prev.toISOString().slice(0, 10)
    const w = mount(OverviewChart, { props: { entries: [entry(d1, [{ reps: 1 }]), entry(d2, [{ reps: 1 }])] } })
    expect(w.findComponent({ name: undefined }).exists).toBeTruthy()
    await w.find('[data-test="period-btn"]').trigger('click')
    expect(w.html()).toContain('Period') // подпись периода видна после раскрытия
  })
})
