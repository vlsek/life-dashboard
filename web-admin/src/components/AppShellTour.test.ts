import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

// Страж (BACKLOG 49.4 / 49.7): в боковом меню каждой страницы есть «Как пользоваться» и «О создателе»;
// тур запускается сам один раз после онбординга (флаг tour_pending).
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

describe('AppShell: тур и «О создателе» в меню', () => {
  it('в меню есть «Как пользоваться» и «О создателе»; клик открывает окно, закрытие — убирает', async () => {
    const w = await mountShell()
    expect(w.find('[data-test="nav-tour"]').text()).toContain('Как пользоваться')
    expect(w.find('[data-test="nav-about"]').text()).toContain('О создателе')
    expect(document.body.textContent).not.toContain('Добро пожаловать!')
    await w.find('[data-test="nav-tour"]').trigger('click')
    expect(document.body.textContent).toContain('Добро пожаловать!')
    await w.find('[data-test="nav-about"]').trigger('click')
    expect(document.body.textContent).toContain('Резюме')
    w.unmount()
  })

  it('после онбординга (tour_pending) тур открывается сам и флаг снимается; без флага — не открывается', async () => {
    const w0 = await mountShell()
    expect(document.body.textContent).not.toContain('Добро пожаловать!')
    w0.unmount()
    localStorage.setItem('tour_pending', '1')
    const w = await mountShell()
    expect(document.body.textContent).toContain('Добро пожаловать!')
    expect(localStorage.getItem('tour_pending')).toBeNull()
    w.unmount()
  })
})
