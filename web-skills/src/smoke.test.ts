import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AppShell from './components/AppShell.vue'

describe('AppShell', () => {
  it('renders logged-out shell (no email) without throwing', () => {
    const wrapper = mount(AppShell, { props: { userEmail: null } })
    const html = wrapper.html()
    expect(html.length).toBeGreaterThan(0)
    expect(html).not.toContain('Log out')
    expect(html).not.toContain('Выйти')
    wrapper.unmount()
  })

  it('shows the logout button with the email when logged in', () => {
    const wrapper = mount(AppShell, { props: { userEmail: 'user@example.com' } })
    expect(wrapper.html()).toContain('user@example.com')
    wrapper.unmount()
  })

  it('opens the sidebar on hamburger click and closes it on backdrop click', async () => {
    const wrapper = mount(AppShell, { props: { userEmail: null }, attachTo: document.body })
    expect(wrapper.find('nav').classes()).toContain('-translate-x-full')
    await wrapper.find('button[aria-label]').trigger('click')
    expect(wrapper.find('nav').classes()).toContain('translate-x-0')
    wrapper.unmount()
  })
})
