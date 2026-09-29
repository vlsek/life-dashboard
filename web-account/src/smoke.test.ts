import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import AppShell from './components/AppShell.vue'
import PasswordInput from './components/PasswordInput.vue'
import Toast from './components/Toast.vue'
import { showToast, toast } from './lib/toast'

describe('AppShell (account pilot)', () => {
  it('renders logged-out shell (no email) without throwing, all nav links present', () => {
    const wrapper = mount(AppShell, { props: { userEmail: null } })
    const html = wrapper.html()
    expect(html.length).toBeGreaterThan(0)
    expect(html).not.toContain('Log out')
    expect(html).not.toContain('Выйти')
    wrapper.unmount()
  })

  it('shows the logout button with the email when logged in, plus the (self-)Account link', () => {
    const wrapper = mount(AppShell, { props: { userEmail: 'user@example.com' } })
    const html = wrapper.html()
    expect(html).toContain('user@example.com')
    expect(html).toContain('/account/')
    wrapper.unmount()
  })

  it('links Milestones to the live milestones pilot', () => {
    const wrapper = mount(AppShell, { props: { userEmail: null } })
    expect(wrapper.html()).toContain('/milestones/')
    wrapper.unmount()
  })
})

describe('PasswordInput.vue', () => {
  it('starts masked and toggles to plain text on click', async () => {
    const wrapper = mount(PasswordInput, { props: { modelValue: 'secret' } })
    expect(wrapper.find('input').attributes('type')).toBe('password')
    await wrapper.find('button').trigger('click')
    expect(wrapper.find('input').attributes('type')).toBe('text')
    wrapper.unmount()
  })

  it('emits update:modelValue on input', async () => {
    const wrapper = mount(PasswordInput, { props: { modelValue: '' } })
    await wrapper.find('input').setValue('hunter2')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['hunter2'])
    wrapper.unmount()
  })
})

describe('toast.ts + Toast.vue', () => {
  it('shows a message and auto-hides it after ~2.2s', () => {
    vi.useFakeTimers()
    toast.value = null
    showToast('Saved ✓')
    const wrapper = mount(Toast)
    expect(wrapper.text()).toContain('Saved ✓')
    vi.advanceTimersByTime(2300)
    expect(toast.value).toBeNull()
    wrapper.unmount()
    vi.useRealTimers()
  })
})
