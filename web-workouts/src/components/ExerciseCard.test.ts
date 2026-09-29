import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ExerciseCard from './ExerciseCard.vue'
import type { Exercise } from '../lib/types'

const exercise = { id: 'ex1', user_id: 'u', name: 'Pull-ups', category: 'upper', tracks_weight: false, unit: null, value_label: null, suggested_scheme: '3x8', created_at: '' } as unknown as Exercise
const body = (w: ReturnType<typeof mount>) => w.find('[data-testid="exercise-body"]')

describe('ExerciseCard collapse', () => {
  beforeEach(() => localStorage.clear())

  it('is expanded by default and collapses on toggle, keeping the header', async () => {
    const w = mount(ExerciseCard, { props: { exercise, entries: [] } })
    expect((body(w).element as HTMLElement).style.display).not.toBe('none')
    await w.find('[data-testid="exercise-toggle"]').trigger('click')
    expect((body(w).element as HTMLElement).style.display).toBe('none')
    expect(w.text()).toContain('Pull-ups')
    expect(localStorage.getItem('workouts_ex_collapsed:ex1')).toBe('1')
  })

  it('starts collapsed when the state was saved earlier, and expands back', async () => {
    localStorage.setItem('workouts_ex_collapsed:ex1', '1')
    const w = mount(ExerciseCard, { props: { exercise, entries: [] } })
    expect((body(w).element as HTMLElement).style.display).toBe('none')
    await w.find('[data-testid="exercise-toggle"]').trigger('click')
    expect((body(w).element as HTMLElement).style.display).not.toBe('none')
    expect(localStorage.getItem('workouts_ex_collapsed:ex1')).toBeNull()
  })
})
