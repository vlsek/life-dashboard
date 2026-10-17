import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { AUTH_KEY, STORE_KEY, captureCurrent, loadStore, readCurrent } from '../../shared/accounts/accounts'

// BACKLOG 1081: переключатель записей в боковом меню, окно «из какой выйти», действия.
const signOut = vi.fn(async () => {
  localStorage.removeItem(AUTH_KEY) // как делает supabase-js
  return { error: null }
})
const revoked: string[] = []
vi.mock('./lib/supabase', () => ({ sb: { auth: { signOut: () => signOut(), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) } } }))
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      setSession: async (s: { access_token: string }) => {
        revoked.push(s.access_token)
        return { error: null }
      },
      signOut: async () => ({ error: null }),
    },
  }),
}))

import AccountSwitcher from './components/AccountSwitcher.vue'
import LogoutChooser from './components/LogoutChooser.vue'
import SidebarTop from './components/SidebarTop.vue'
import { addAccount, logoutEverywhere, logoutThis, switchAccount } from './lib/accountsActions'

const sess = (id: string) => JSON.stringify({ access_token: `at-${id}`, refresh_token: `rt-${id}`, user: { id, email: `${id}@x.io` } })
const login = (id: string) => {
  localStorage.setItem(AUTH_KEY, sess(id))
  captureCurrent()
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  signOut.mockClear()
  revoked.length = 0
})

describe('действия', () => {
  it('switchAccount: ложит сессию в стандартный ключ и перезагружает; на текущую — ничего', () => {
    login('a')
    login('b')
    const reload = vi.fn()
    expect(switchAccount('b', reload)).toBe(false)
    expect(reload).not.toHaveBeenCalled()
    expect(switchAccount('a', reload)).toBe(true)
    expect(reload).toHaveBeenCalledTimes(1)
    expect(readCurrent()?.id).toBe('a')
  })
  it('addAccount: ведёт на вход с ?add=1 и не выходит на сервере; при трёх записях отказ', () => {
    login('a')
    const go = vi.fn()
    expect(addAccount(go)).toBe(true)
    expect(go).toHaveBeenCalledWith('/login/?add=1')
    expect(signOut).not.toHaveBeenCalled()
    expect(loadStore().map((x) => x.id)).toEqual(['a'])
    login('b')
    login('c')
    const go2 = vi.fn()
    expect(addAccount(go2)).toBe(false)
    expect(go2).not.toHaveBeenCalled()
  })
  it('logoutThis: остаётся другая запись — она активна, переход на главную; последняя — на вход', async () => {
    login('a')
    login('b')
    const go = vi.fn()
    await logoutThis(go)
    expect(signOut).toHaveBeenCalledTimes(1)
    expect(go).toHaveBeenCalledWith('/')
    expect(readCurrent()?.id).toBe('a')
    await logoutThis(go)
    expect(go).toHaveBeenLastCalledWith('/login/')
    expect(localStorage.getItem(STORE_KEY)).toBeNull()
    expect(readCurrent()).toBeNull()
  })
  it('logoutEverywhere: остальные записи отзываются на сервере, склад и сессия очищены, на вход', async () => {
    login('a')
    login('b')
    login('c')
    const go = vi.fn()
    await logoutEverywhere(go)
    expect([...revoked].sort()).toEqual(['at-a', 'at-b'])
    expect(signOut).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem(STORE_KEY)).toBeNull()
    expect(readCurrent()).toBeNull()
    expect(go).toHaveBeenCalledWith('/login/')
  })
})

describe('AccountSwitcher', () => {
  it('свёрнут; раскрывается списком: активная отмечена, остальные — кнопки; счётчик n/3', async () => {
    login('a')
    login('b')
    const w = mount(AccountSwitcher)
    expect(w.find('[data-test="acc-list"]').exists()).toBe(false)
    await w.find('[data-test="acc-toggle"]').trigger('click')
    expect(w.find('[data-test="acc-count"]').text()).toBe('2/3')
    expect(w.find('[data-test="acc-active"]').text()).toContain('b@x.io')
    expect(w.find('[data-test="acc-switch-a"]').text()).toContain('a@x.io')
    expect(w.find('[data-test="acc-add"]').exists()).toBe(true)
  })
  it('при трёх записях вместо «Добавить» — пояснение', async () => {
    for (const id of ['a', 'b', 'c']) login(id)
    const w = mount(AccountSwitcher)
    await w.find('[data-test="acc-toggle"]').trigger('click')
    expect(w.find('[data-test="acc-add"]').exists()).toBe(false)
    expect(w.find('[data-test="acc-full"]').exists()).toBe(true)
  })
})

describe('LogoutChooser', () => {
  it('две кнопки выхода и «Отмена»; «из этой записи» зовёт signOut один раз', async () => {
    login('a')
    login('b')
    const w = mount(LogoutChooser)
    expect(w.find('[data-test="logout-this"]').text()).toContain('b@x.io')
    expect(w.find('[data-test="logout-all"]').text()).toContain('(2)')
    await w.find('[data-test="logout-cancel"]').trigger('click')
    expect(w.emitted('close')).toHaveLength(1)
    await w.find('[data-test="logout-this"]').trigger('click')
    await flushPromises()
    expect(signOut).toHaveBeenCalledTimes(1)
  })
})

describe('боковое меню', () => {
  it('верх бокового меню содержит переключатель записей (на всех страницах, без правки пилотов)', () => {
    login('a')
    const w = mount(SidebarTop, { props: { displayName: 'Иван', email: 'a@x.io', avatarUrl: null, showProgress: false, day: null, week: null } as never })
    expect(w.find('[data-test="acc-switcher"]').exists()).toBe(true)
  })
})
