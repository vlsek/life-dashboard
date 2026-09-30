import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

// Ссылка на классическую версию страницы — одна, внизу выдвижного меню (по запросу владельца);
// плашки «пилот» в сайдбаре больше нет. lib/supabase замокан, чтобы не тянуть настоящий клиент.
vi.mock('../lib/supabase', () => ({ logout: vi.fn() }))

beforeEach(() => {
  vi.resetModules()
  globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ version: '1.00', en: [], ru: [] }))) as unknown as typeof fetch
})

describe('AppShell: ссылка на legacy', () => {
  it('показывает legacy-history с адресом классической версии и без плашки пилота', async () => {
    const { default: AppShell } = await import('./AppShell.vue')
    const w = mount(AppShell, { props: { userEmail: null } })
    const link = w.find('[data-test="legacy-link"]')
    expect(link.exists()).toBe(true)
    expect(link.text()).toBe('legacy-history')
    expect(link.attributes('href')).toBe('/legacy/history.html')
    expect(w.text()).not.toMatch(/pilot|пилот/i)
    w.unmount()
  })
})
