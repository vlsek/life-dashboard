import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('./lib/supabase', () => ({ sb: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: { message: 'x' } }) }) }), upsert: () => Promise.resolve({ error: null }) }) } }))
import { GOALS_KEY, goalFor, muscleGoals, normalizeGoals, setGoal } from './lib/muscleGoals'
import { todayFocus } from './lib/todayFocus'
import MuscleMap from './components/MuscleMap.vue'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  muscleGoals.value = {}
})

describe('normalizeGoals / goalFor (80.5)', () => {
  it('оставляет известные группы и целые 1..60; значение по умолчанию и мусор отбрасывает', () => {
    expect(normalizeGoals({ back: 15, calves: 6, chest: 10, abs: 0, biceps: 61, glutes: 2.5, wings: 9, quads: '8' })).toEqual({ back: 15, calves: 6 })
    expect(normalizeGoals(null)).toEqual({})
    expect(normalizeGoals([1, 2])).toEqual({})
  })
  it('goalFor: своя цель или 10', () => {
    expect(goalFor({ back: 15 }, 'back')).toBe(15)
    expect(goalFor({ back: 15 }, 'chest')).toBe(10)
  })
  it('setGoal пишет в хранилище устройства; значение 10 и null убирают свою цель', () => {
    setGoal('back', 15)
    expect(JSON.parse(localStorage.getItem(GOALS_KEY)!)).toEqual({ back: 15 })
    setGoal('back', 10)
    expect(muscleGoals.value).toEqual({})
    setGoal('calves', 6)
    setGoal('calves', null)
    expect(JSON.parse(localStorage.getItem(GOALS_KEY)!)).toEqual({})
  })
})

describe('цели в «Что тренировать сегодня»', () => {
  const ex = [{ id: 'bench', name: 'Жим лёжа' }]
  const E = (n: number) => ({ exercise_id: 'bench', date: '2026-10-29', sets: Array.from({ length: n }, () => ({ reps: 10, weight: 20, side: null })) }) as never
  it('при цели 6 грудь с 6 подходами закрыта, при 15 — нет', () => {
    expect(todayFocus([E(6)], ex, '2026-11-02', { chest: 6 }).map((x) => x.muscle)).not.toContain('chest')
    const f = todayFocus([E(6)], ex, '2026-11-02', { chest: 15 }).find((x) => x.muscle === 'chest')
    expect(f?.target).toBe(15)
  })
})

describe('панель мышцы: пресеты цели', () => {
  const bench = { id: 'bench', name: 'Жим лёжа' } as never
  it('нажатие на «Приоритет» ставит 15 и подсвечивает кнопку', async () => {
    const w = mount(MuscleMap, { props: { entries: [], exercises: [bench], today: '2026-11-02' } })
    await w.find('[data-testid="muscle-map-toggle"]').trigger('click')
    await w.find('[data-muscle="chest"]').trigger('click')
    expect(w.find('[data-testid="goal-preset-normal"]').attributes('aria-pressed')).toBe('true')
    await w.find('[data-testid="goal-preset-priority"]').trigger('click')
    expect(muscleGoals.value).toEqual({ chest: 15 })
    expect(w.find('[data-testid="goal-preset-priority"]').attributes('aria-pressed')).toBe('true')
    expect(w.find('[data-testid="goal-preset-normal"]').attributes('aria-pressed')).toBe('false')
  })
})
