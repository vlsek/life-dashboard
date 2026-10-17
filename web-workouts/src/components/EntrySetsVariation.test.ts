import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import EntrySets from './EntrySets.vue'
import type { Exercise, WorkoutSet } from '../lib/types'

const ex = { id: 'e', name: 'отжимания', tracks_weight: false } as unknown as Exercise
const sets: WorkoutSet[] = [{ reps: 10, weight: null, time: '10:00', duration: null, side: null, variation: 'узкий хват' }, { reps: 8, weight: null, time: '10:05', duration: null, side: null }]

describe('EntrySets: особенность подхода', () => {
  it('поле в каждой строке, значение подставлено', () => {
    const w = mount(EntrySets, { props: { exercise: ex, sets } })
    const inputs = w.findAll('[data-testid="entry-set-variation"]')
    expect(inputs).toHaveLength(2)
    expect((inputs[0].element as HTMLInputElement).value).toBe('узкий хват')
  })
  it('правка отдаёт новый список с особенностью во второй строке', async () => {
    const w = mount(EntrySets, { props: { exercise: ex, sets } })
    const input = w.findAll('[data-testid="entry-set-variation"]')[1]
    ;(input.element as HTMLInputElement).value = 'медленно'
    await input.trigger('change')
    const out = w.emitted('change')![0][0] as WorkoutSet[]
    expect(out[1].variation).toBe('медленно')
    expect(out[0].variation).toBe('узкий хват')
  })
})
