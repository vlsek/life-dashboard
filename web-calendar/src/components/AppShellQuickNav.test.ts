import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

// Быстрые ссылки в верхней панели (BACKLOG 16, «14:55»): круглая кнопка с шевроном вместо «>>>».
vi.mock('../lib/supabase', () => ({ logout: vi.fn() }))

beforeEach(() => {
  vi.resetModules()
  // по умолчанию избранными считаем все страницы меню — прежние проверки списка остаются в силе (BACKLOG 6.2)
  localStorage.setItem('favorite_pages', JSON.stringify(['goals', 'skills', 'workouts', 'challenges', 'english', 'calendar', 'milestones', 'shop', 'achievements', 'community']))
  globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ version: '1.00', en: [], ru: [] }))) as unknown as typeof fetch
})

async function mountShell() {
  const { default: AppShell } = await import('./AppShell.vue')
  return mount(AppShell, { props: { userEmail: null }, attachTo: document.body })
}

describe('AppShell: «Избранное» (левое сердечко со списком) — только на главной (BACKLOG 45.1)', () => {
  it('на странице раздела кнопки «Избранное» и списка быстрых ссылок нет — здесь только правое сердечко «в избранное» из шапки', async () => {
    const w = await mountShell()
    expect(w.find('[data-testid="quicknav-toggle"]').exists()).toBe(false)
    expect(w.find('[data-testid="quicknav-list"]').exists()).toBe(false)
    expect(w.find('[data-test="qn-heart"]').exists()).toBe(false)
    w.unmount()
  })
})


describe('AppShell: боковое меню — профиль наверху, «История» внизу (BACKLOG 6.2)', () => {
  async function mountWithEmail() {
    const { default: AppShell } = await import('./AppShell.vue')
    return mount(AppShell, { props: { userEmail: 'a@b.c' }, attachTo: document.body })
  }
  const navLinks = (w: Awaited<ReturnType<typeof mountWithEmail>>) => w.find('nav').findAll('a').map((a) => a.attributes('href'))

  it('первым в <nav> стоит якорь #sidebar-top — туда бандл /header-widgets/ рисует аватар и имя', async () => {
    const w = await mountWithEmail()
    const first = w.find('nav').element.firstElementChild as HTMLElement
    expect(first.id).toBe('sidebar-top')
    w.unmount()
  })

  it('«Кастомизация» отделена разделителем и стоит внизу списка, за ней «Аккаунт»; отдельной «Истории» больше нет', async () => {
    const w = await mountWithEmail()
    const links = navLinks(w)
    expect(links.filter((h) => h === '/history/')).toHaveLength(0)
    const customization = links.indexOf('/customization/')
    expect(customization).toBeGreaterThan(-1)
    expect(links[customization + 1]).toBe('/account/')
    expect(links.filter((h) => h === '/customization/')).toHaveLength(1)
    expect(links.indexOf('/community/')).toBeLessThan(customization)
    const nav = w.find('nav').element
    const customizationEl = nav.querySelector('a[href="/customization/"]')!
    expect((customizationEl.previousElementSibling as HTMLElement).className).toContain('border-t')
    w.unmount()
  })
})

// BACKLOG 🐞 «14:40 — кнопка «Избранное» наверху пустая: просто пустой кружок, а просили с сердечком».
// Круглая кнопка быстрой навигации рисовала только маленький шеврон — теперь в ней сердечко (контур — список закрыт, залито — открыт).

describe('AppShell: пока левая шторка открыта, страница под ней не прокручивается (BACKLOG 23:01)', () => {
  async function mountOpen() {
    const { default: AppShell } = await import('./AppShell.vue')
    document.documentElement.style.overflow = ''
    document.documentElement.removeAttribute('data-lock-left')
    document.documentElement.removeAttribute('data-lock-right')
    return mount(AppShell, { props: { userEmail: null }, attachTo: document.body })
  }
  const burger = (w: Awaited<ReturnType<typeof mountOpen>>) => w.find('button[aria-label]')

  it('открытие шторки блокирует прокрутку <html>, закрытие по затемнению — возвращает; у затемнения нет жеста прокрутки', async () => {
    const w = await mountOpen()
    await burger(w).trigger('click')
    expect(document.documentElement.style.overflow).toBe('hidden')
    expect(document.documentElement.hasAttribute('data-lock-left')).toBe(true)
    const overlay = w.find('[data-testid="sidebar-overlay"]')
    expect(overlay.attributes('style')).toContain('touch-action: none')
    await overlay.trigger('click')
    expect(document.documentElement.style.overflow).toBe('')
    expect(document.documentElement.hasAttribute('data-lock-left')).toBe(false)
    w.unmount()
  })

  it('если открыта и правая панель (атрибут data-lock-right), закрытие левой шторки прокрутку не возвращает; при размонтировании блокировка снимается', async () => {
    const w = await mountOpen()
    document.documentElement.setAttribute('data-lock-right', '')
    await burger(w).trigger('click')
    await w.find('[data-testid="sidebar-overlay"]').trigger('click')
    expect(document.documentElement.style.overflow).toBe('hidden')
    document.documentElement.removeAttribute('data-lock-right')
    await burger(w).trigger('click')
    w.unmount()
    expect(document.documentElement.hasAttribute('data-lock-left')).toBe(false)
    expect(document.documentElement.style.overflow).toBe('')
  })
})
