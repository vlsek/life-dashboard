import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

// Supabase подменяем: проверяем поведение страницы, а не сеть.
const signInWithPassword = vi.fn()
const signUp = vi.fn()
const getSession = vi.fn()
vi.mock('./lib/supabase', () => ({
  sb: {
    auth: { getSession: (...a: unknown[]) => getSession(...a), signInWithPassword: (...a: unknown[]) => signInWithPassword(...a), signUp: (...a: unknown[]) => signUp(...a), signInWithOAuth: vi.fn() },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { onboarded: true } }) }) }) }),
  },
}))

import App from './App.vue'

beforeEach(() => {
  vi.clearAllMocks()
  getSession.mockResolvedValue({ data: { session: null } })
  localStorage.setItem('site_lang', 'en')
})

describe('login page', () => {
  it('renders the form and switches between login and sign-up tabs', async () => {
    const w = mount(App)
    await flushPromises()
    expect(w.text()).toContain('Log in')
    expect(w.find('button[type=submit]').text()).toBe('Log in')
    const tabs = w.findAll('button[type=button]').filter((b) => ['Log in', 'Sign up'].includes(b.text()))
    await tabs[1].trigger('click')
    expect(w.find('button[type=submit]').text()).toBe('Sign up')
  })

  it('asks to fill in both fields instead of calling Supabase with empty input', async () => {
    const w = mount(App)
    await flushPromises()
    await w.find('form').trigger('submit')
    expect(w.text()).toContain('Fill in email and password.')
    expect(signInWithPassword).not.toHaveBeenCalled()
  })

  it('shows the Supabase error message when sign-in fails', async () => {
    signInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials', status: 400 } })
    const w = mount(App)
    await flushPromises()
    await w.find('input[type=email]').setValue('a@b.c')
    await w.find('input[type=password]').setValue('secret')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(w.text()).toContain('Error: Invalid login credentials (code 400)')
  })

  it('tells the user to check email when sign-up returns no session', async () => {
    signUp.mockResolvedValue({ data: { session: null }, error: null })
    const w = mount(App)
    await flushPromises()
    const tabs = w.findAll('button[type=button]').filter((b) => ['Log in', 'Sign up'].includes(b.text()))
    await tabs[1].trigger('click')
    await w.find('input[type=email]').setValue('a@b.c')
    await w.find('input[type=password]').setValue('secret')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(w.text()).toContain('Check your email')
  })
})
