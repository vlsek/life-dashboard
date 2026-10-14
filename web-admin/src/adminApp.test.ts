import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// Заглушка Supabase: сценарий задаётся через `h` (hoisted — vi.mock поднимается выше импортов).
const h = vi.hoisted(() => ({
  session: { user: { id: 'me', email: 'me@x.com' } } as { user: { id: string; email: string } } | null,
  users: [] as unknown[],
  listError: null as { message: string } | null,
  debugRow: { debug_mode: false } as { debug_mode: boolean } | null,
  debugSelectError: null as { message: string } | null,
  debugRpcError: null as { message: string } | null,
  deleteError: null as { message: string } | null,
  rpcCalls: [] as { fn: string; args: unknown }[],
}))

vi.mock('./lib/supabase', () => ({
  logout: vi.fn(),
  sb: {
    auth: { getSession: async () => ({ data: { session: h.session } }), signOut: async () => ({}) },
    rpc: async (fn: string, args?: unknown) => {
      h.rpcCalls.push({ fn, args })
      if (fn === 'admin_list_users') return h.listError ? { data: null, error: h.listError } : { data: h.users, error: null }
      if (fn === 'set_debug_mode') return { data: null, error: h.debugRpcError }
      if (fn === 'admin_delete_user') return { data: null, error: h.deleteError }
      return { data: null, error: null }
    },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: h.debugRow, error: h.debugSelectError }) }) }) }),
  },
}))

import App from './App.vue'
import { settleConfirm, confirmState } from './lib/confirmDialog'
import { toast } from './lib/toast'

const ME = { user_id: 'me', email: 'me@x.com', display_name: 'Я', is_admin: true, created_at: '2026-01-05T08:00:00Z' }
const ANYA = { user_id: 'u2', email: 'anya@x.com', display_name: 'Аня', is_admin: false, created_at: '2026-03-07T10:00:00Z' }
const NONAME = { user_id: 'u3', email: 'noname@x.com', display_name: null, is_admin: false, created_at: null }

async function open() {
  const w = mount(App, { attachTo: document.body })
  await flushPromises()
  return w
}

beforeEach(() => {
  h.session = { user: { id: 'me', email: 'me@x.com' } }
  h.users = [ME, ANYA, NONAME]
  h.listError = null
  h.debugRow = { debug_mode: false }
  h.debugSelectError = null
  h.debugRpcError = null
  h.deleteError = null
  h.rpcCalls = []
  toast.value = null
  settleConfirm(false)
  document.body.innerHTML = ''
})

describe('Админка (Vue): таблица пользователей', () => {
  it('показывает имя, e-mail, значок админа и дату ДД.ММ.ГГГГ; без display_name — «—»', async () => {
    const w = await open()
    const rows = w.findAll('tbody tr')
    expect(rows).toHaveLength(3)
    expect(rows[1].text()).toContain('Аня')
    expect(rows[1].text()).toContain('anya@x.com')
    expect(rows[1].text()).toContain('07.03.2026')
    expect(rows[0].findAll('td')[2].find('svg').exists()).toBe(true) // значок «админ» — в колонке «Админ»
    expect(rows[1].findAll('td')[2].find('svg').exists()).toBe(false)
    expect(rows[1].find('[data-test="delete-u2"] svg').exists()).toBe(true) // иконка корзины на кнопке «Удалить»
    expect(rows[2].findAll('td')[0].text()).toBe('—')
    expect(rows[2].findAll('td')[3].text()).toBe('')
    w.unmount()
  })

  it('себя выделяет, подписывает «(это ты)» и кнопки удаления у себя нет', async () => {
    const w = await open()
    const me = w.get('[data-test="user-row-me"]')
    expect(me.findAll('td')[0].attributes('style')).toContain('var(--accent)')
    expect(me.find('[data-test="self-mark"]').exists()).toBe(true)
    expect(me.find('button').exists()).toBe(false)
    expect(w.find('[data-test="delete-u2"]').exists()).toBe(true)
    w.unmount()
  })
})

describe('Админка (Vue): удаление пользователя', () => {
  it('подтверждение с именем → rpc admin_delete_user(target_user) → тост и перечитанный список', async () => {
    const w = await open()
    await w.get('[data-test="delete-u2"]').trigger('click')
    expect(confirmState.current?.message).toContain('Аня')
    h.users = [ME, NONAME]
    settleConfirm(true)
    await flushPromises()
    expect(h.rpcCalls.filter((c) => c.fn === 'admin_delete_user')).toEqual([{ fn: 'admin_delete_user', args: { target_user: 'u2' } }])
    expect(w.findAll('tbody tr')).toHaveLength(2)
    expect(toast.value?.type).toBe('success')
    w.unmount()
  })

  it('в подтверждении без имени — e-mail', async () => {
    const w = await open()
    await w.get('[data-test="delete-u3"]').trigger('click')
    expect(confirmState.current?.message).toContain('noname@x.com')
    settleConfirm(false)
    w.unmount()
  })

  it('«Отмена» — ничего не удаляется', async () => {
    const w = await open()
    await w.get('[data-test="delete-u2"]').trigger('click')
    settleConfirm(false)
    await flushPromises()
    expect(h.rpcCalls.some((c) => c.fn === 'admin_delete_user')).toBe(false)
    expect(w.findAll('tbody tr')).toHaveLength(3)
    w.unmount()
  })

  it('ошибка сервера: тост-ошибка человеческим текстом, технический message не показывается, список не меняется', async () => {
    h.deleteError = { message: 'permission denied for table auth.users at https://haxmgtflegsfpxieaydv.supabase.co' }
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const w = await open()
    await w.get('[data-test="delete-u2"]').trigger('click')
    settleConfirm(true)
    await flushPromises()
    expect(toast.value?.type).toBe('error')
    expect(toast.value?.message).not.toMatch(/supabase|auth\.users|permission denied/i)
    expect(w.findAll('tbody tr')).toHaveLength(3)
    spy.mockRestore()
    w.unmount()
  })
})

describe('Админка (Vue): нет доступа', () => {
  it('ошибка списка → карточка «нет доступа» с подсказкой про is_admin; таблицы и карточки отладки нет; сырой текст ошибки скрыт', async () => {
    h.listError = { message: 'not an admin: relation profiles at https://haxmgtflegsfpxieaydv.supabase.co' }
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const w = await open()
    const card = w.get('[data-test="admin-no-access"]')
    expect(card.text()).toMatch(/Нет доступа|No access/)
    expect(card.find('code').exists()).toBe(true)
    expect(card.text()).not.toMatch(/supabase\.co|relation profiles/)
    expect(w.find('[data-test="users-table"]').exists()).toBe(false)
    expect(w.find('[data-test="debug-card"]').exists()).toBe(false)
    spy.mockRestore()
    w.unmount()
  })

  it('нет сессии → переход на /login/, страница пользователей не рисуется', async () => {
    h.session = null
    const loc = { href: '' }
    vi.stubGlobal('location', { ...window.location, get href() { return loc.href }, set href(v: string) { loc.href = v } })
    const w = await open()
    expect(loc.href).toBe('/login/')
    expect(w.find('[data-test="users-table"]').exists()).toBe(false)
    vi.unstubAllGlobals()
    w.unmount()
  })
})

describe('Админка (Vue): режим отладки (BACKLOG 47.4)', () => {
  it('включение: rpc set_debug_mode(p_on=true), тост, галочка стоит', async () => {
    const w = await open()
    const box = w.get('#debug-mode-toggle')
    expect((box.element as HTMLInputElement).checked).toBe(false)
    ;(box.element as HTMLInputElement).checked = true
    await box.trigger('change')
    await flushPromises()
    expect(h.rpcCalls.filter((c) => c.fn === 'set_debug_mode')).toEqual([{ fn: 'set_debug_mode', args: { p_on: true } }])
    expect((w.get('#debug-mode-toggle').element as HTMLInputElement).checked).toBe(true)
    expect(toast.value?.type).toBe('success')
    w.unmount()
  })

  it('выключение при включённом режиме: p_on=false', async () => {
    h.debugRow = { debug_mode: true }
    const w = await open()
    const box = w.get('#debug-mode-toggle')
    expect((box.element as HTMLInputElement).checked).toBe(true)
    ;(box.element as HTMLInputElement).checked = false
    await box.trigger('change')
    await flushPromises()
    expect(h.rpcCalls.find((c) => c.fn === 'set_debug_mode')?.args).toEqual({ p_on: false })
    w.unmount()
  })

  it('ошибка сервера: галочка откатывается, тост-ошибка', async () => {
    h.debugRpcError = { message: 'function set_debug_mode does not exist' }
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const w = await open()
    const box = w.get('#debug-mode-toggle')
    ;(box.element as HTMLInputElement).checked = true
    await box.trigger('change')
    await flushPromises()
    expect((w.get('#debug-mode-toggle').element as HTMLInputElement).checked).toBe(false)
    expect(toast.value?.type).toBe('error')
    spy.mockRestore()
    w.unmount()
  })

  it('колонки нет (миграция 066 не применена) или строки нет: карточки нет, таблица есть', async () => {
    h.debugSelectError = { message: 'column profiles.debug_mode does not exist' }
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const w = await open()
    expect(w.find('[data-test="debug-card"]').exists()).toBe(false)
    expect(w.find('[data-test="users-table"]').exists()).toBe(true)
    spy.mockRestore()
    w.unmount()
  })
})
