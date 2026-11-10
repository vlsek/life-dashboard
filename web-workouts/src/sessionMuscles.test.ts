import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { sessionFill, sessionMuscles } from './lib/sessionMuscles'
import SessionMuscleMap from './components/SessionMuscleMap.vue'
import type { Exercise } from './lib/types'

// BACKLOG 80.8: мини-карта в активной тренировке — мышцы сессии заливаются по мере выполненных подходов.
beforeEach(() => localStorage.setItem('site_lang', 'ru'))
const ex = (id: string, groups: string[]): Exercise => ({ id, name: id, muscle_groups: groups }) as unknown as Exercise
const exercises = [ex('bench', ['chest', 'triceps']), ex('row', ['back', 'biceps'])]
const set = (done: boolean, type?: string) => ({ done, ...(type ? { type } : {}) })

describe('sessionMuscles', () => {
  it('подходы по мышцам: всего и выполненных; разминка не считается', () => {
    const draft = [
      { exercise_id: 'bench', sets: [set(true), set(true), set(false), set(true, 'warmup')] },
      { exercise_id: 'row', sets: [set(false), set(false)] },
    ]
    const r = sessionMuscles(draft, exercises)
    expect(r.chest).toEqual({ total: 3, done: 2 })
    expect(r.triceps).toEqual({ total: 3, done: 2 })
    expect(r.back).toEqual({ total: 2, done: 0 })
    expect(r.quads).toBeUndefined()
  })
  it('две упражнения на одну мышцу складываются; неизвестная группа игнорируется', () => {
    const r = sessionMuscles([{ exercise_id: 'bench', sets: [set(true)] }, { exercise_id: 'x', sets: [set(true)] }], [ex('bench', ['chest', 'nonsense']), ex('x', ['chest'])])
    expect(r.chest).toEqual({ total: 2, done: 2 })
    expect(Object.keys(r)).toEqual(['chest'])
  })
  it('заливка: вне сессии null, без галочек 0, дальше доля', () => {
    expect(sessionFill(undefined)).toBeNull()
    expect(sessionFill({ total: 0, done: 0 })).toBeNull()
    expect(sessionFill({ total: 4, done: 0 })).toBe(0)
    expect(sessionFill({ total: 4, done: 3 })).toBe(0.75)
    expect(sessionFill({ total: 2, done: 5 })).toBe(1)
  })
})

describe('SessionMuscleMap', () => {
  const draft = [{ exercise_id: 'bench', sets: [set(true), set(false)] }]
  it('рисует обе проекции; зоны сессии залиты по доле, остальные «off»; подпись для скринридера', () => {
    const w = mount(SessionMuscleMap, { props: { draft, exercises } })
    expect(w.findAll('svg')).toHaveLength(2)
    const chest = w.find('path[data-muscle="chest"]')
    expect(chest.attributes('data-fill')).toBe('0.5')
    expect(w.find('path[data-muscle="quads"]').attributes('data-fill')).toBe('off')
    expect(w.get('[data-testid="session-map"]').attributes('aria-label')).toContain('Грудь 1/2')
  })
  it('нет упражнений с мышцами — карты нет', () => {
    expect(mount(SessionMuscleMap, { props: { draft: [], exercises } }).find('[data-testid="session-map"]').exists()).toBe(false)
  })
})
