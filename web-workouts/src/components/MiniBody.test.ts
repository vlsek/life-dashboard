import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import MiniBody from './MiniBody.vue'
import StartFocus from './StartFocus.vue'
import type { Exercise, WorkoutEntry } from '../lib/types'

// BACKLOG 69.17, срез 4: мини-силуэт в карточке «Сегодня можно тренировать»
const lit = (w: ReturnType<typeof mount>, view: 'front' | 'back') => w.findAll(`[data-view="${view}"] path[data-lit="1"]`).map((p) => p.attributes('data-muscle'))

describe('MiniBody', () => {
  it('рисует вид спереди и сзади и подсвечивает только переданные группы', () => {
    const w = mount(MiniBody, { props: { highlight: ['chest', 'quads'] } })
    expect(w.findAll('[data-view]')).toHaveLength(2)
    expect([...new Set(lit(w, 'front'))].sort()).toEqual(['chest', 'quads'])
    expect(lit(w, 'back')).toEqual([])
  })
  it('подсвеченная группа залита акцентным цветом, остальные нейтральным', () => {
    const w = mount(MiniBody, { props: { highlight: ['chest'] } })
    const chest = w.get('[data-view="front"] path[data-muscle="chest"]')
    const abs = w.get('[data-view="front"] path[data-muscle="abs"]')
    expect(chest.attributes('fill')).toBe('var(--accent)')
    expect(abs.attributes('fill')).toBe('var(--border)')
  })
  it('мышцы со спины (спина, ягодицы) видны на виде сзади', () => {
    const w = mount(MiniBody, { props: { highlight: ['back', 'glutes'] } })
    expect([...new Set(lit(w, 'back'))].sort()).toEqual(['back', 'glutes'])
    expect(lit(w, 'front')).toEqual([])
  })
  it('без подсветки ничего не горит; неизвестная группа не ломает', () => {
    const w = mount(MiniBody, { props: { highlight: ['nope'] } })
    expect(w.findAll('path[data-lit="1"]')).toHaveLength(0)
  })
  it('модель тела меняет контуры, но подсветка работает для всех моделей', () => {
    for (const model of ['male', 'female', 'chibi', 'leggy', 'stocky'] as const) {
      const w = mount(MiniBody, { props: { highlight: ['abs'], model } })
      expect(lit(w, 'front')).toEqual(['abs'])
    }
    const a = mount(MiniBody, { props: { highlight: [], model: 'male' } }).get('[data-view="front"] path').attributes('d')
    const b = mount(MiniBody, { props: { highlight: [], model: 'female' } }).get('[data-view="front"] path').attributes('d')
    expect(a).not.toBe(b)
  })
  it('есть текстовая подпись для скринридера', () => {
    expect(mount(MiniBody, { props: { highlight: ['chest'] } }).get('svg').attributes('aria-label')).toBe('chest')
  })
})

describe('StartFocus с мини-картой', () => {
  const ex = (id: string, name: string): Exercise => ({ id, user_id: 'u', name, category: null, tracks_weight: true, value_label: null, unit: 'кг', suggested_scheme: null, created_at: '2026-01-01' })
  const entry = (id: string, exercise_id: string, date: string): WorkoutEntry => ({ id, user_id: 'u', exercise_id, date, sets: [{ reps: 8, weight: 60, time: '18:00' }], notes: null, session_id: null } as WorkoutEntry)
  it('подсвечены те же группы, что и в чипах', () => {
    const w = mount(StartFocus, { props: { entries: [entry('1', 'e1', '2026-10-29'), entry('2', 'e3', '2026-10-26')], exercises: [ex('e1', 'Жим лёжа'), ex('e3', 'Приседания')], today: '2026-10-30' } })
    const chips = w.findAll('[data-testid="start-focus-chip"]').length
    expect(chips).toBeGreaterThan(0)
    const litMuscles = new Set([...w.findAll('path[data-lit="1"]')].map((p) => p.attributes('data-muscle')))
    expect(litMuscles.size).toBeGreaterThanOrEqual(1)
    expect(litMuscles.has('chest')).toBe(false) // грудь тренировали вчера — не рекомендуется и не горит
    expect(litMuscles.has('quads')).toBe(true)
  })
})
