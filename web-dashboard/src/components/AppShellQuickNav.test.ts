import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

// Быстрые ссылки в верхней панели (BACKLOG 16, «14:55»): круглая кнопка с шевроном вместо «>>>».
vi.mock('../lib/supabase', () => ({ logout: vi.fn() }))

beforeEach(() => {
  vi.resetModules()
  // по умолчанию избранными считаем все страницы меню — прежние проверки списка остаются в силе (BACKLOG 6.2)
  localStorage.setItem('favorite_pages', JSON.stringify(['goals', 'skills', 'workouts', 'challenges', 'english', 'calendar', 'milestones', 'shop', 'community', 'history']))
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
    expect(list.findAll('.qn-chip-active').length).toBe(0)
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
    expect(chips(w)).toEqual(['/shop/', '/history/'])
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

  it('«История» отделена разделителем и стоит в самом низу списка страниц — сразу перед «Аккаунтом»; в основной части её нет', async () => {
    const w = await mountWithEmail()
    const links = navLinks(w)
    const hist = links.indexOf('/history/')
    expect(hist).toBeGreaterThan(-1)
    expect(links.filter((h) => h === '/history/')).toHaveLength(1)
    expect(links[hist + 1]).toBe('/account/')
    expect(links.indexOf('/community/')).toBeLessThan(hist)
    // разделитель между основными страницами и «Историей»
    const nav = w.find('nav').element
    const histEl = nav.querySelector('a[href="/history/"]')!
    expect((histEl.previousElementSibling as HTMLElement).className).toContain('border-t')
    w.unmount()
  })
})
