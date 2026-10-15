import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import TodayPanel from './TodayPanel.vue'
import JournalList from './JournalList.vue'
import { todayStr } from '../lib/date'
import type { Exercise, WorkoutEntry } from '../lib/types'

const ex = { id: 'a', name: 'отжимания', category: 'upper', tracks_weight: false } as unknown as Exercise
const mk = (id: string, date: string, n: number): WorkoutEntry =>
  ({ id, user_id: 'u', exercise_id: 'a', date, notes: null, sets: Array.from({ length: n }, () => ({ reps: 10, time: '10:00' })) }) as unknown as WorkoutEntry

describe('TodayPanel', () => {
  it('пусто — подсказка, без кнопок', () => {
    const w = mount(TodayPanel, { props: { entries: [mk('1', '2000-01-01', 2)], exercises: [ex] } })
    expect(w.find('[data-testid="today-empty"]').exists()).toBe(true)
    expect(w.findAll('[data-testid="today-add-set"]')).toHaveLength(0)
  })
  it('сегодняшняя запись: строка, сводка и «+ подход» шлёт запись', async () => {
    const e = mk('1', todayStr(), 3)
    const w = mount(TodayPanel, { props: { entries: [e, mk('2', '2000-01-01', 5)], exercises: [ex] } })
    expect(w.findAll('[data-testid="today-row"]')).toHaveLength(1)
    expect(w.get('[data-testid="today-summary"]').text()).toContain('3')
    await w.get('[data-testid="today-add-set"]').trigger('click')
    expect(w.emitted('addSet')![0][0]).toEqual(e)
  })
})

describe('JournalList', () => {
  it('дни свежие сверху, пусто — подсказка', () => {
    const w = mount(JournalList, { props: { entries: [mk('1', '2026-10-10', 1), mk('2', '2026-10-12', 2)], exercises: [ex] } })
    expect(w.findAll('[data-testid="journal-date"]').map((x) => x.text())).toEqual(['12.10.2026', '10.10.2026'])
    expect(mount(JournalList, { props: { entries: [], exercises: [ex] } }).find('[data-testid="journal-empty"]').exists()).toBe(true)
  })
})
