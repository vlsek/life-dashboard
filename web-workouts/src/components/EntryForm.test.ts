import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import EntryForm from './EntryForm.vue'
import type { Exercise } from '../lib/types'

const exercise = (over: Partial<Exercise> = {}): Exercise =>
  ({
    id: 'ex1',
    user_id: 'u',
    name: 'Curl',
    category: 'upper',
    tracks_weight: true,
    unit: 'kg',
    value_label: null,
    suggested_scheme: null,
    tracks_duration: false,
    bilateral: true,
    ...over,
  }) as unknown as Exercise

describe('EntryForm: left and right in one block', () => {
  it('shows one row with L and R cells for a bilateral exercise and saves two sided sets', async () => {
    const w = mount(EntryForm, { props: { exercise: exercise(), existing: null } })
    expect(w.findAll('[data-testid="set-row"]')).toHaveLength(1)
    const nums = w.findAll('input[type="number"]')
    expect(nums).toHaveLength(4) // reps+weight для Л и для П
    await nums[0].setValue('10')
    await nums[1].setValue('20')
    await nums[2].setValue('9')
    await nums[3].setValue('18')
    await w.find('form').trigger('submit')
    const saved = w.emitted('save')![0][0] as { sets: { reps: number; weight: number; side: string }[] }
    expect(saved.sets.map((s) => [s.side, s.reps, s.weight])).toEqual([['L', 10, 20], ['R', 9, 18]])
  })

  it('keeps a plain single row for non-bilateral exercises', async () => {
    const w = mount(EntryForm, { props: { exercise: exercise({ bilateral: false }), existing: null } })
    const nums = w.findAll('input[type="number"]')
    expect(nums).toHaveLength(2)
    await nums[0].setValue('12')
    await w.find('form').trigger('submit')
    const saved = w.emitted('save')![0][0] as { sets: { side: string | null }[] }
    expect(saved.sets).toHaveLength(1)
    expect(saved.sets[0].side).toBeNull()
  })

  it('drops the empty side when only one side was filled in', async () => {
    const w = mount(EntryForm, { props: { exercise: exercise(), existing: null } })
    await w.findAll('input[type="number"]')[0].setValue('8')
    await w.find('form').trigger('submit')
    const saved = w.emitted('save')![0][0] as { sets: { side: string }[] }
    expect(saved.sets.map((s) => s.side)).toEqual(['L'])
  })
})
