import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { authErrorText } from './authError'

// BACKLOG 942: человеческие сообщения Supabase Auth остаются, технические — заменяются понятным текстом.
beforeEach(() => {
  localStorage.setItem('site_lang', 'ru')
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => vi.restoreAllMocks())

describe('authErrorText', () => {
  it('понятное сообщение Auth остаётся как есть', () => {
    expect(authErrorText({ message: 'New password should be different from the old password.' })).toBe('New password should be different from the old password.')
  })
  it('сеть и «нет доступа» — понятный текст, без адреса сервера', () => {
    expect(authErrorText({ message: 'TypeError: Failed to fetch (https://abcd1234.supabase.co/auth/v1/user)' })).toBe('Нет связи с сервером. Проверь интернет и попробуй ещё раз.')
    expect(authErrorText({ message: 'JWT expired' })).toBe('Нет доступа. Войди заново и повтори.')
  })
  it('сообщение с адресом/таблицей/драйвером не показывается, даже если тип «прочее»', () => {
    for (const m of ['error at https://abcd1234.supabase.co/auth/v1/user', 'relation "profiles" does not exist', 'supabase said no'])
      expect(authErrorText({ message: m }), m).toBe('Не получилось сохранить. Попробуй ещё раз.')
  })
  it('пустое/null — общий текст', () => {
    expect(authErrorText(null)).toBe('Не получилось сохранить. Попробуй ещё раз.')
    expect(authErrorText({})).toBe('Не получилось сохранить. Попробуй ещё раз.')
  })
})
