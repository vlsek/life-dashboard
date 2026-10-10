import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

// Страж (BACKLOG 49.4): подсказка страницы открывается сама один раз при первом входе, потом — по значку «i»;
// поверх тура «Как пользоваться» сама не открывается.
vi.mock('../lib/supabase', () => ({ logout: vi.fn() }))

beforeEach(() => {
  vi.resetModules()
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ version: '1.00', en: [], ru: [] }))) as unknown as typeof fetch
})

async function mountShell() {
  const { default: AppShell } = await import('./AppShell.vue')
  return mount(AppShell, { props: { userEmail: 'a@b.c' }, attachTo: document.body })
}
const seenKeys = () => Object.keys(localStorage).filter((k) => k.startsWith('page_hint_seen_'))

describe('AppShell: подсказка страницы и значок «i»', () => {
  it('первый вход — подсказка открыта; «Понятно» закрывает и запоминает; следующий вход — закрыта; значок открывает снова', async () => {
    const w = await mountShell()
    expect(w.find('[data-test="page-hint"]').exists()).toBe(true)
    expect(w.find('[data-test="page-hint-btn"]').attributes('aria-expanded')).toBe('true')
    await w.find('[data-test="page-hint-ok"]').trigger('click')
    expect(w.find('[data-test="page-hint"]').exists()).toBe(false)
    expect(seenKeys()).toHaveLength(1)
    w.unmount()
    const w2 = await mountShell()
    expect(w2.find('[data-test="page-hint"]').exists()).toBe(false)
    await w2.find('[data-test="page-hint-btn"]').trigger('click')
    expect(w2.find('[data-test="page-hint"]').exists()).toBe(true)
    w2.unmount()
  })

  it('пока открыт тур (tour_pending), подсказка сама не открывается и не считается увиденной', async () => {
    localStorage.setItem('tour_pending', '1')
    const w = await mountShell()
    expect(w.find('[data-test="page-hint"]').exists()).toBe(false)
    expect(seenKeys()).toHaveLength(0)
    w.unmount()
  })
})
