import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

// BACKLOG 60.2 п.2 (владелец 2026-10-12): ссылок на старую (классическую) версию страниц больше нет — ни внизу выдвижного меню, ни где-либо в оболочке.
// Заглушки-редиректы в корне и сама папка /legacy/ остаются (старые закладки работают), но из интерфейса на них не ведёт ничего.
vi.mock('../lib/supabase', () => ({ logout: vi.fn() }))

beforeEach(() => {
  vi.resetModules()
  globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ version: '1.00', en: [], ru: [] }))) as unknown as typeof fetch
})

describe('AppShell: ссылок на legacy нет', () => {
  it('в меню нет ссылки legacy-… и ни одного адреса /legacy/', async () => {
    const { default: AppShell } = await import('./AppShell.vue')
    const w = mount(AppShell, { props: { userEmail: null } })
    expect(w.find('[data-test="legacy-link"]').exists()).toBe(false)
    expect(w.html()).not.toContain('/legacy/')
    expect(w.text()).not.toMatch(/legacy-|pilot|пилот/i)
    w.unmount()
  })
})
