import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

// Быстрые ссылки в верхней панели (BACKLOG 16, «14:55»): круглая кнопка с шевроном вместо «>>>».
vi.mock('../lib/supabase', () => ({ logout: vi.fn() }))

beforeEach(() => {
  vi.resetModules()
  globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ version: '1.00', en: [], ru: [] }))) as unknown as typeof fetch
})

async function mountShell() {
  const { default: AppShell } = await import('./AppShell.vue')
  return mount(AppShell, { props: { userEmail: null }, attachTo: document.body })
}

describe('AppShell: быстрые ссылки', () => {
  it('кнопка закрыта по умолчанию: aria-expanded=false, списка нет, текста «>>>» нет', async () => {
    const w = await mountShell()
    const btn = w.find('[data-testid="quicknav-toggle"]')
    expect(btn.attributes('aria-expanded')).toBe('false')
    expect(btn.attributes('aria-controls')).toBe('quick-nav')
    expect(w.find('[data-testid="quicknav-list"]').exists()).toBe(false)
    expect(btn.text()).not.toContain('>')
    expect(btn.find('svg').exists()).toBe(true)
    w.unmount()
  })

  it('клик раскрывает ссылки на остальные разделы; текущий раздел выделен; Дашборд в списке нет', async () => {
    const w = await mountShell()
    await w.find('[data-testid="quicknav-toggle"]').trigger('click')
    expect(w.find('[data-testid="quicknav-toggle"]').attributes('aria-expanded')).toBe('true')
    const list = w.find('[data-testid="quicknav-list"]')
    expect(list.attributes('id')).toBe('quick-nav')
    const links = list.findAll('a')
    expect(links.length).toBeGreaterThanOrEqual(10)
    expect(links.some((a) => a.attributes('href') === '/dashboard/')).toBe(false)
    expect(list.findAll('.qn-chip-active').length).toBe(1)
    w.unmount()
  })

  it('повторный клик и клавиша Esc закрывают список', async () => {
    const w = await mountShell()
    await w.find('[data-testid="quicknav-toggle"]').trigger('click')
    await w.find('[data-testid="quicknav-toggle"]').trigger('click')
    expect(w.find('[data-testid="quicknav-list"]').exists()).toBe(false)
    await w.find('[data-testid="quicknav-toggle"]').trigger('click')
    expect(w.find('[data-testid="quicknav-list"]').exists()).toBe(true)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await w.vm.$nextTick()
    expect(w.find('[data-testid="quicknav-list"]').exists()).toBe(false)
    expect(w.find('[data-testid="quicknav-toggle"]').attributes('aria-expanded')).toBe('false')
    w.unmount()
  })
})
