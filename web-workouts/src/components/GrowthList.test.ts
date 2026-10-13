import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import GrowthList from './GrowthList.vue'
import { addDaysIso, todayStr } from '../lib/date'
import type { Exercise, WorkoutEntry } from '../lib/types'

const ex = (id: string, name: string): Exercise => ({ id, user_id: 'u', name, category: null, tracks_weight: false, value_label: null, unit: null, suggested_scheme: null, created_at: '2026-01-01' })
const en = (exercise_id: string, ago: number, reps: number): WorkoutEntry => ({ id: exercise_id + ago, user_id: 'u', exercise_id, date: addDaysIso(todayStr(), -ago), sets: [{ reps, weight: null, time: null, duration: null, side: null }], notes: null })

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
})

describe('GrowthList («Что растёт»)', () => {
  it('строки по статусам с процентом и «было → стало»', () => {
    const w = mount(GrowthList, { props: { exercises: [ex('a', 'подтягивания'), ex('b', 'отжимания')], entries: [en('a', 40, 10), en('a', 5, 12), en('b', 40, 20), en('b', 5, 10)] } })
    const rows = w.findAll('[data-testid="growth-row"]')
    expect(rows.map((r) => r.attributes('data-status'))).toEqual(['up', 'down'])
    expect(rows[0].text()).toContain('Подтягивания')
    expect(rows[0].find('[data-testid="growth-delta"]').text()).toBe('+20%')
    expect(rows[0].find('[data-testid="growth-text"]').text()).toBe('10 → 12')
    expect(rows[1].find('[data-testid="growth-delta"]').text()).toBe('-50%')
  })
  it('нет записей за последние 28 дней — подсказка вместо списка', () => {
    const w = mount(GrowthList, { props: { exercises: [ex('a', 'подтягивания')], entries: [en('a', 60, 10)] } })
    expect(w.find('[data-testid="growth-empty"]').exists()).toBe(true)
    expect(w.findAll('[data-testid="growth-row"]')).toHaveLength(0)
  })
  it('у нового упражнения (без прошлого окна) — «новое» и один подход без стрелки «было»', () => {
    const w = mount(GrowthList, { props: { exercises: [ex('a', 'пресс')], entries: [en('a', 3, 15)] } })
    expect(w.find('[data-testid="growth-delta"]').text()).toBe('новое')
    expect(w.find('[data-testid="growth-text"]').text()).toBe('15')
  })
})
