import { beforeEach, describe, expect, it } from 'vitest'
import {
  AUTH_KEY, MAX_ACCOUNTS, STORE_KEY, accountCount, canAddAccount, captureCurrent, clearAll, listAccounts, loadStore, prepareAdd, readCurrent,
  removeAccount, sessionsToRevoke, switchTo,
} from '../../shared/accounts/accounts'

// BACKLOG 1081: несколько учётных записей (до 3) на одном устройстве — склад сессий поверх стандартного хранилища supabase-js.
const sess = (id: string, email = `${id}@x.io`, rt = `rt-${id}`) => JSON.stringify({ access_token: `at-${id}`, refresh_token: rt, expires_at: 1, user: { id, email } })
const login = (id: string, rt?: string) => localStorage.setItem(AUTH_KEY, sess(id, undefined, rt))

beforeEach(() => localStorage.clear())

describe('ключ хранилища', () => {
  it('это стандартный ключ supabase-js для проекта сайта — пилоты и старые страницы читают именно его', () => {
    expect(AUTH_KEY).toBe('sb-haxmgtflegsfpxieaydv-auth-token')
    expect(MAX_ACCOUNTS).toBe(3)
  })
})

describe('readCurrent', () => {
  it('сессия читается; пустое, мусор и сессия без пользователя/refresh_token — null', () => {
    expect(readCurrent()).toBeNull()
    login('a')
    expect(readCurrent()).toMatchObject({ id: 'a', email: 'a@x.io' })
    for (const bad of ['', '{', 'null', '[]', '{"user":{"id":"a"}}', '{"refresh_token":"r"}', '{"refresh_token":"r","user":{}}']) {
      localStorage.setItem(AUTH_KEY, bad)
      expect(readCurrent(), bad).toBeNull()
    }
  })
})

describe('captureCurrent / listAccounts', () => {
  it('текущая запись попадает в склад; повторный снимок обновляет токены, а не дублирует', () => {
    login('a', 'r1')
    captureCurrent(10)
    login('a', 'r2')
    const list = captureCurrent(20)
    expect(list).toHaveLength(1)
    expect(JSON.parse(list[0].session).refresh_token).toBe('r2')
    expect(list[0].savedAt).toBe(20)
  })
  it('без входа склад не меняется; мусор в складе игнорируется', () => {
    expect(captureCurrent()).toEqual([])
    localStorage.setItem(STORE_KEY, '{"x":1}')
    expect(loadStore()).toEqual([])
    localStorage.setItem(STORE_KEY, JSON.stringify([{ id: 'a', session: sess('a') }, { id: 'a', session: sess('a') }, { nope: 1 }, { id: 'b' }]))
    expect(loadStore().map((a) => a.id)).toEqual(['a'])
  })
  it('список: активная первой, у неё active; запись, ещё не снятая в склад, тоже видна', () => {
    login('a')
    captureCurrent(1)
    login('b')
    captureCurrent(2)
    login('a')
    expect(listAccounts()).toEqual([{ id: 'a', email: 'a@x.io', active: true }, { id: 'b', email: 'b@x.io', active: false }])
    login('c') // вошли, шапка ещё не успела снять
    expect(listAccounts().map((v) => v.id + (v.active ? '*' : ''))).toEqual(['c*', 'a', 'b'])
  })
  it('больше трёх не хранится: новая запись вытесняет самую давнюю неактивную', () => {
    for (const [i, id] of ['a', 'b', 'c'].entries()) {
      login(id)
      captureCurrent(i + 1)
    }
    login('d')
    const list = captureCurrent(10)
    expect(list.map((a) => a.id).sort()).toEqual(['b', 'c', 'd'])
  })
})

describe('switchTo', () => {
  it('переносит сессию выбранной записи в AUTH_KEY и не теряет свежие токены прежней', () => {
    login('a', 'a1')
    captureCurrent(1)
    login('b')
    captureCurrent(2)
    login('a', 'a-fresh') // токены a обновились после снимка
    expect(switchTo('b')).toBe(true)
    expect(readCurrent()?.id).toBe('b')
    expect(JSON.parse(loadStore().find((x) => x.id === 'a')!.session).refresh_token).toBe('a-fresh')
    expect(switchTo('a')).toBe(true)
    expect(JSON.parse(localStorage.getItem(AUTH_KEY)!).refresh_token).toBe('a-fresh')
  })
  it('на текущую или неизвестную запись — false, ничего не меняется', () => {
    login('a')
    captureCurrent()
    expect(switchTo('a')).toBe(false)
    expect(switchTo('zzz')).toBe(false)
    expect(readCurrent()?.id).toBe('a')
  })
})

describe('prepareAdd', () => {
  it('снимает текущую и освобождает AUTH_KEY; запись остаётся в складе', () => {
    login('a')
    expect(prepareAdd()).toBe(true)
    expect(localStorage.getItem(AUTH_KEY)).toBeNull()
    expect(loadStore().map((x) => x.id)).toEqual(['a'])
    login('b') // вошли на странице входа
    captureCurrent()
    expect(accountCount()).toBe(2)
  })
  it('при трёх записях добавить нельзя, текущая запись остаётся на месте', () => {
    for (const id of ['a', 'b', 'c']) {
      login(id)
      captureCurrent()
    }
    expect(canAddAccount()).toBe(false)
    expect(prepareAdd()).toBe(false)
    expect(readCurrent()?.id).toBe('c')
  })
})

describe('removeAccount / clearAll', () => {
  it('выход из активной при других записях — активируется первая из оставшихся', () => {
    login('a')
    captureCurrent(1)
    login('b')
    captureCurrent(2)
    expect(removeAccount('b')).toBe('switched')
    expect(readCurrent()?.id).toBe('a')
    expect(loadStore().map((x) => x.id)).toEqual(['a'])
  })
  it('выход из последней — на страницу входа: склад и сессия пусты', () => {
    login('a')
    captureCurrent()
    expect(removeAccount('a')).toBe('none')
    expect(localStorage.getItem(AUTH_KEY)).toBeNull()
    expect(loadStore()).toEqual([])
  })
  it('выход из неактивной не трогает текущую сессию', () => {
    login('a')
    captureCurrent(1)
    login('b')
    captureCurrent(2)
    expect(removeAccount('a')).toBe('switched')
    expect(readCurrent()?.id).toBe('b')
  })
  it('«из всех»: sessionsToRevoke — все, кроме текущей; clearAll стирает склад и сессию', () => {
    for (const id of ['a', 'b', 'c']) {
      login(id)
      captureCurrent()
    }
    expect(sessionsToRevoke().map((s) => s.id).sort()).toEqual(['a', 'b'])
    clearAll()
    expect(localStorage.getItem(AUTH_KEY)).toBeNull()
    expect(localStorage.getItem(STORE_KEY)).toBeNull()
  })
})
