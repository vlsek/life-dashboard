import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { AUTH_KEY, STORE_KEY, captureCurrent, readCurrent } from '../../shared/accounts/accounts'

// BACKLOG 1081: страница входа показывает записи, уже сохранённые на устройстве, и режим «Добавить запись» (?add=1).
const getSession = vi.fn()
vi.mock('./lib/supabase', () => ({
  sb: {
    auth: { getSession: (...a: unknown[]) => getSession(...a), signInWithPassword: vi.fn(), signUp: vi.fn(), signInWithOAuth: vi.fn() },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { onboarded: true } }) }) }) }),
  },
}))

import App from './App.vue'

const sess = (id: string) => JSON.stringify({ access_token: `at-${id}`, refresh_token: `rt-${id}`, user: { id, email: `${id}@x.io` } })
let clock = 1000
const save = (id: string) => {
  localStorage.setItem(AUTH_KEY, sess(id))
  captureCurrent(++clock) // время задаём явно: «последняя снятая» не должна зависеть от того, в одну ли миллисекунду сняты записи
}
const setSearch = (s: string) => window.history.replaceState({}, '', '/login/' + s)
const hrefSet = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  getSession.mockResolvedValue({ data: { session: null } })
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  setSearch('')
  Object.defineProperty(window, 'location', { configurable: true, value: { ...window.location, search: '', set href(v: string) { hrefSet(v) } } })
})
const mountWith = async (search = '') => {
  Object.defineProperty(window, 'location', { configurable: true, value: { ...window.location, search, set href(v: string) { hrefSet(v) } } })
  const w = mount(App)
  await flushPromises()
  return w
}

describe('сохранённые записи на странице входа', () => {
  it('записей нет и это не режим добавления — блока нет', async () => {
    const w = await mountWith()
    expect(w.find('[data-test="saved-accounts"]').exists()).toBe(false)
  })
  it('есть записи — кнопка «Войти как …»; нажатие делает запись активной и уводит на главную', async () => {
    save('a')
    save('b')
    localStorage.removeItem(AUTH_KEY) // вышли из активной на устройстве, склад остался
    const w = await mountWith()
    expect(w.find('[data-test="saved-a"]').text()).toContain('a@x.io')
    expect(w.find('[data-test="saved-adding"]').exists()).toBe(false)
    await w.find('[data-test="saved-b"]').trigger('click')
    expect(readCurrent()?.id).toBe('b')
    expect(hrefSet).toHaveBeenCalledWith('/')
  })
  it('режим ?add=1: пояснение и «Отмена» возвращает последнюю снятую запись', async () => {
    save('a')
    save('b')
    localStorage.removeItem(AUTH_KEY) // так делает prepareAdd
    const w = await mountWith('?add=1')
    expect(w.find('[data-test="saved-adding"]').exists()).toBe(true)
    await w.find('[data-test="saved-cancel"]').trigger('click')
    expect(readCurrent()?.id).toBe('b')
    expect(hrefSet).toHaveBeenCalledWith('/')
  })
  it('режим ?add=1 без записей в складе — подсказка есть, «Отмены» нет', async () => {
    const w = await mountWith('?add=1')
    expect(w.find('[data-test="saved-adding"]').exists()).toBe(true)
    expect(w.find('[data-test="saved-cancel"]').exists()).toBe(false)
    expect(localStorage.getItem(STORE_KEY)).toBeNull()
  })
})

describe('после входа запись попадает в склад', () => {
  it('redirectAfterAuth снимает сессию (страницу онбординга шапка пропускает)', async () => {
    localStorage.setItem(AUTH_KEY, sess('n'))
    getSession.mockResolvedValue({ data: { session: { user: { id: 'n' } } } })
    await mountWith()
    expect(JSON.parse(localStorage.getItem(STORE_KEY)!)[0].id).toBe('n')
  })
})
