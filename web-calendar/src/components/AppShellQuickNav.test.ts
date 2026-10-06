import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

// Быстрые ссылки в верхней панели (BACKLOG 16, «14:55»): круглая кнопка с шевроном вместо «>>>».
vi.mock('../lib/supabase', () => ({ logout: vi.fn() }))

beforeEach(() => {
  vi.resetModules()
  // по умолчанию избранными считаем все страницы меню — прежние проверки списка остаются в силе (BACKLOG 6.2)
  localStorage.setItem('favorite_pages', JSON.stringify(['goals', 'skills', 'workouts', 'challenges', 'english', 'calendar', 'milestones', 'shop', 'achievements', 'community', 'history']))
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

describe('AppShell: «Избранное» в списке по шеврону (BACKLOG 6.2)', () => {
  const chips = (w: Awaited<ReturnType<typeof mountShell>>) => w.find('[data-testid="quicknav-list"]').findAll('a').map((a) => a.attributes('href'))

  it('в списке только избранные страницы; остальные в сайдбаре остаются', async () => {
    localStorage.setItem('favorite_pages', JSON.stringify(['shop', 'history']))
    const w = await mountShell()
    await w.find('[data-testid="quicknav-toggle"]').trigger('click')
    expect(chips(w)).toEqual(['/shop/'])
    expect(w.findAll('nav a[href="/goals/"]').length).toBe(1)
    w.unmount()
  })

  it('избранного нет — вместо чипов подсказка про сердечко', async () => {
    localStorage.removeItem('favorite_pages')
    const w = await mountShell()
    await w.find('[data-testid="quicknav-toggle"]').trigger('click')
    expect(chips(w)).toEqual([])
    expect(w.find('[data-testid="quicknav-empty"]').text().length).toBeGreaterThan(5)
    w.unmount()
  })

  it('мусор в localStorage и неизвестные ключи не ломают список; Дашборд даже в избранном в нём не появляется', async () => {
    localStorage.setItem('favorite_pages', '{oops')
    let w = await mountShell()
    await w.find('[data-testid="quicknav-toggle"]').trigger('click')
    expect(chips(w)).toEqual([])
    w.unmount()
    localStorage.setItem('favorite_pages', JSON.stringify(['dashboard', 'nope', 'shop']))
    w = await mountShell()
    await w.find('[data-testid="quicknav-toggle"]').trigger('click')
    expect(chips(w)).toEqual(['/shop/'])
    w.unmount()
  })

  it('событие favorites:changed (сердечко в шапке) обновляет открытый список сразу', async () => {
    localStorage.setItem('favorite_pages', JSON.stringify(['shop']))
    const w = await mountShell()
    await w.find('[data-testid="quicknav-toggle"]').trigger('click')
    expect(chips(w)).toEqual(['/shop/'])
    localStorage.setItem('favorite_pages', JSON.stringify(['shop', 'goals']))
    window.dispatchEvent(new CustomEvent('favorites:changed'))
    await w.vm.$nextTick()
    expect(chips(w)).toEqual(['/goals/', '/shop/'])
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
describe('AppShell: значок кнопки быстрой навигации — сердечко', () => {
  it('в круглой кнопке есть svg-сердечко (путь контура сердца), а не пустой кружок и не шеврон; подпись «Избранное»', async () => {
    const w = await mountShell()
    const btn = w.find('[data-testid="quicknav-toggle"]')
    const heart = btn.find('[data-test="qn-heart"]')
    expect(heart.exists()).toBe(true)
    expect(heart.find('path').attributes('d')).toMatch(/^M12 20\.4/) // контур сердца; у прежнего шеврона путь был «M7 4l6 6-6 6»
    expect(btn.attributes('aria-label')).toMatch(/^(Favorites|Избранное)$/)
    expect(btn.attributes('title')).toBe(btn.attributes('aria-label'))
    w.unmount()
  })

  it('при открытии кнопка получает qn-open (заливка сердечка цветом темы через CSS), сам значок остаётся на месте', async () => {
    const w = await mountShell()
    await w.find('[data-testid="quicknav-toggle"]').trigger('click')
    expect(w.find('[data-testid="quicknav-toggle"]').classes()).toContain('qn-open')
    expect(w.find('[data-test="qn-heart"]').exists()).toBe(true)
    w.unmount()
  })
})

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
