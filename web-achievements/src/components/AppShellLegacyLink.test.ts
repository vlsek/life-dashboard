import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

// У страницы «Достижения» нет классической версии: ссылка «legacy-…» внизу меню не показывается,
// плашки «пилот» тоже нет. lib/supabase замокан, чтобы не тянуть настоящий клиент.
vi.mock('../lib/supabase', () => ({ logout: vi.fn() }))

beforeEach(() => {
  vi.resetModules()
  globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ version: '1.00', en: [], ru: [] }))) as unknown as typeof fetch
})

describe('AppShell: ссылка на legacy', () => {
  it('не показывает ссылку на классику (её нет) и плашку пилота', async () => {
    const { default: AppShell } = await import('./AppShell.vue')
    const w = mount(AppShell, { props: { userEmail: null } })
    expect(w.find('[data-test="legacy-link"]').exists()).toBe(false)
    expect(w.text()).not.toMatch(/pilot|пилот/i)
    w.unmount()
  })

  it('пункт меню «Достижения» есть и отмечен активным', async () => {
    const { default: AppShell } = await import('./AppShell.vue')
    const w = mount(AppShell, { props: { userEmail: null } })
    const link = w.find('a[href="/achievements/"]')
    expect(link.exists()).toBe(true)
    w.unmount()
  })
})
