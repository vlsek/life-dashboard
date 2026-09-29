import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// Точечный тест кнопки версии в AppShell.vue (не полный набор AppShell — свайпы/логаут/тема
// уже не относятся к этой задаче). lib/supabase замокан, чтобы не тянуть настоящий клиент.
vi.mock('../lib/supabase', () => ({ logout: vi.fn() }))

const originalFetch = globalThis.fetch
beforeEach(() => {
  vi.resetModules()
  globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ version: '1.09', en: [{ version: '1.09', date: '', changes: ['x'] }], ru: [] }))) as unknown as typeof fetch
})
afterEach(() => {
  globalThis.fetch = originalFetch
  vi.restoreAllMocks()
})

describe('AppShell: кнопка версии', () => {
  it('показывает номер версии после загрузки и открывает ченджлог по клику', async () => {
    const { default: AppShell } = await import('./AppShell.vue')
    const w = mount(AppShell, { props: { userEmail: null }, attachTo: document.body })
    await flushPromises()
    const btn = w.find('[data-test="version-btn"]')
    expect(btn.exists()).toBe(true)
    expect(btn.text()).toBe('v1.09')
    expect(document.body.querySelector('[data-test="changelog-modal"]')).toBeNull()
    await btn.trigger('click')
    expect(document.body.querySelector('[data-test="changelog-modal"]')).not.toBeNull()
    w.unmount()
  })
})
