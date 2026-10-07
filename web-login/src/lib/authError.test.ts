import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { authErrorText } from './authError'

// BACKLOG 942 (срез 4): человеческие сообщения Supabase Auth остаются, технические — заменяются понятным текстом.
beforeEach(() => {
  localStorage.setItem('site_lang', 'ru')
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => vi.restoreAllMocks())

describe('authErrorText', () => {
  it('понятное сообщение Auth остаётся как есть — оно объясняет, что исправить', () => {
    expect(authErrorText({ message: 'Invalid login credentials', status: 400 })).toBe('Invalid login credentials')
    expect(authErrorText({ message: 'Password should be at least 6 characters.' })).toBe('Password should be at least 6 characters.')
  })
  it('код ответа «(код 400)» не показывается', () => {
    expect(authErrorText({ message: 'User already registered', status: 400 })).not.toMatch(/400|код|code/i)
  })
  it('сеть и «нет доступа» — понятный текст, без адреса сервера и TypeError', () => {
    expect(authErrorText(new TypeError('Failed to fetch'))).toBe('Нет связи с сервером. Проверь интернет и попробуй ещё раз.')
    expect(authErrorText({ message: 'TypeError: Failed to fetch (https://abcd1234.supabase.co/auth/v1/token)' })).toBe('Нет связи с сервером. Проверь интернет и попробуй ещё раз.')
    expect(authErrorText({ message: 'JWT expired' })).toBe('Нет доступа. Войди заново и повтори.')
  })
  it('сообщение с адресом/таблицей/драйвером/JSON не показывается, даже если тип «прочее»', () => {
    for (const m of ['error at https://abcd1234.supabase.co/auth/v1/token', 'relation "profiles" does not exist', 'supabase said no', '{"weird":true}'])
      expect(authErrorText({ message: m }), m).toBe('Не получилось войти. Попробуй ещё раз.')
  })
  it('пустое, null и объект без полей — общий текст про вход (раньше показывалась пустота/JSON)', () => {
    for (const e of [null, undefined, {}, { weird: true }]) expect(authErrorText(e)).toBe('Не получилось войти. Попробуй ещё раз.')
  })
  it('язык по site_lang; подробности только в консоль', () => {
    localStorage.setItem('site_lang', 'en')
    expect(authErrorText({ message: 'Failed to fetch' })).toContain('connection')
    expect(authErrorText({ message: 'relation "x"' })).toBe('Could not sign in. Please try again.')
    expect(console.error).toHaveBeenCalled()
  })
})
