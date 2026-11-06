import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('../lib/supabase', () => ({ sb: { from: () => ({ upsert: async () => ({ error: null }) }) } }))

import StreakPause from './StreakPause.vue'
import { pauses } from '../lib/pauses'
import { DATA_CHANGED } from '../lib/events'
import { todayStr } from '../lib/date'

describe('StreakPause', () => {
  beforeEach(() => {
    pauses.value = []
    localStorage.clear()
  })
  it('starts an open pause and tells the dashboard to recount', async () => {
    const seen = vi.fn()
    window.addEventListener(DATA_CHANGED, seen)
    const w = mount(StreakPause)
    await w.get('[data-test="pause-kind"]').setValue('sick')
    await w.get('[data-test="pause-add"]').trigger('click')
    expect(pauses.value).toEqual([{ from: todayStr(), to: null, kind: 'sick' }])
    expect(seen).toHaveBeenCalledTimes(1)
    expect(w.find('[data-test="pause-active"]').exists()).toBe(true)
    await w.get('[data-test="pause-end"]').trigger('click')
    expect(pauses.value[0].to).toBe(todayStr())
    window.removeEventListener(DATA_CHANGED, seen)
  })
  it('shows an error for a bad range and does not save', async () => {
    const w = mount(StreakPause)
    await w.get('[data-test="pause-from"]').setValue(todayStr())
    await w.get('[data-test="pause-to"]').setValue('2020-01-01')
    await w.get('[data-test="pause-add"]').trigger('click')
    expect(w.find('[data-test="pause-invalid"]').exists()).toBe(true)
    expect(pauses.value).toEqual([])
  })
})
