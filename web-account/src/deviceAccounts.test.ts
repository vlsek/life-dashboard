import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { AUTH_KEY, captureCurrent, readCurrent } from '../../shared/accounts/accounts'
import DeviceAccounts from './components/DeviceAccounts.vue'

// BACKLOG 1081: карточка «Записи на этом устройстве» на странице «Аккаунт».
const sess = (id: string) => JSON.stringify({ access_token: `at-${id}`, refresh_token: `rt-${id}`, user: { id, email: `${id}@x.io` } })
const login = (id: string) => {
  localStorage.setItem(AUTH_KEY, sess(id))
  captureCurrent()
}
const reload = vi.fn()
const hrefSet = vi.fn()

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  reload.mockClear()
  hrefSet.mockClear()
  Object.defineProperty(window, 'location', { configurable: true, value: { ...window.location, reload, set href(v: string) { hrefSet(v) } } })
})

describe('DeviceAccounts', () => {
  it('одна запись: счётчик 1/3, она текущая, есть «Добавить запись»', () => {
    login('a')
    const w = mount(DeviceAccounts)
    expect(w.find('[data-test="device-count"]').text()).toBe('1/3')
    expect(w.find('[data-test="device-active"]').text()).toContain('a@x.io')
    expect(w.find('[data-test="device-add"]').exists()).toBe(true)
  })
  it('«Переключить» делает запись активной и перезагружает страницу', async () => {
    login('a')
    login('b')
    const w = mount(DeviceAccounts)
    expect(w.find('[data-test="device-active"]').text()).toContain('b@x.io')
    await w.find('[data-test="device-switch-a"]').trigger('click')
    expect(readCurrent()?.id).toBe('a')
    expect(reload).toHaveBeenCalledTimes(1)
  })
  it('«Добавить запись» ведёт на вход с ?add=1 и не разлогинивает текущую на сервере', async () => {
    login('a')
    const w = mount(DeviceAccounts)
    await w.find('[data-test="device-add"]').trigger('click')
    expect(hrefSet).toHaveBeenCalledWith('/login/?add=1')
    expect(localStorage.getItem(AUTH_KEY)).toBeNull()
  })
  it('три записи: «Добавить» нет, есть пояснение', () => {
    for (const id of ['a', 'b', 'c']) login(id)
    const w = mount(DeviceAccounts)
    expect(w.find('[data-test="device-count"]').text()).toBe('3/3')
    expect(w.find('[data-test="device-add"]').exists()).toBe(false)
    expect(w.find('[data-test="device-full"]').exists()).toBe(true)
  })
})
