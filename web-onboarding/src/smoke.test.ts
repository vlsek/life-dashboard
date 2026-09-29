import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const getSession = vi.fn()
const profileMaybeSingle = vi.fn()
const upsert = vi.fn()
const insert = vi.fn()
vi.mock('./lib/supabase', () => ({
  sb: {
    auth: { getSession: (...a: unknown[]) => getSession(...a) },
    from: (table: string) => ({
      select: () => ({ eq: () => ({ maybeSingle: (...a: unknown[]) => profileMaybeSingle(...a) }) }),
      upsert: (...a: unknown[]) => upsert(table, ...a),
      insert: (...a: unknown[]) => insert(table, ...a),
    }),
    storage: undefined,
  },
}))

import App from './App.vue'

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  localStorage.setItem('site_lang', 'en')
  getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } })
  profileMaybeSingle.mockResolvedValue({ data: { onboarded: false } })
  upsert.mockReturnValue({ select: async () => ({ data: [] }) })
  insert.mockResolvedValue({ error: null })
})

describe('onboarding page', () => {
  it('shows the form once the session is confirmed not onboarded yet', async () => {
    const w = mount(App)
    await flushPromises()
    expect(w.text()).toContain('A couple of questions to start')
    expect(w.find('button[type=submit]').exists()).toBe(true)
  })

  it('hides height/weight/priority fields for the planner usecase', async () => {
    const w = mount(App)
    await flushPromises()
    expect(w.text()).toContain('Height (cm)')
    const selects = w.findAll('select')
    await selects[1].setValue('planner') // selects[0] — переключатель темы из LangThemeBar
    expect(w.text()).not.toContain('Height (cm)')
  })

  it('rejects a birthdate in the future before calling Supabase', async () => {
    const w = mount(App)
    await flushPromises()
    const dateInput = w.find('input[type=date]')
    await dateInput.setValue('2999-01-01')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(w.text()).toContain('Date of birth must be between')
    expect(upsert).not.toHaveBeenCalled()
  })

  it('skip button marks onboarded and seeds base metrics without opening the form', async () => {
    upsert.mockReturnValue(Promise.resolve({ error: null }))
    const w = mount(App)
    await flushPromises()
    const skipBtn = w.findAll('button').find((b) => b.text().includes('Skip'))!
    await skipBtn.trigger('click')
    await flushPromises()
    expect(upsert).toHaveBeenCalledWith('profiles', expect.objectContaining({ user_id: 'u1', onboarded: true }))
    expect(insert).toHaveBeenCalledWith('metrics', expect.any(Array))
  })
})
