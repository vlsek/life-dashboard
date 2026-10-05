import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { errorKind, friendlyError } from './friendlyError'

// Пользователь никогда не видит адрес Supabase, имя таблицы и текст драйвера (BACKLOG раздел 35): только понятный текст по типу ошибки.
beforeEach(() => {
  localStorage.setItem('site_lang', 'ru')
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => vi.restoreAllMocks())

describe('errorKind', () => {
  it('сетевые сбои', () => {
    for (const m of ['TypeError: Failed to fetch', 'NetworkError when attempting to fetch resource.', 'Load failed', 'Network request failed', 'The request timed out'])
      expect(errorKind(new Error(m)), m).toBe('network')
  })
  it('нет доступа', () => {
    expect(errorKind({ code: '42501', message: 'new row violates row-level security policy for table "goals"' })).toBe('forbidden')
    expect(errorKind({ status: 401, message: 'x' })).toBe('forbidden')
    expect(errorKind({ message: 'JWT expired' })).toBe('forbidden')
  })
  it('связанные данные и неверные значения', () => {
    expect(errorKind({ code: '23503', message: 'violates foreign key constraint' })).toBe('in_use')
    expect(errorKind({ code: '22P02', message: 'invalid input syntax for type integer: ""' })).toBe('validation')
    expect(errorKind({ code: '23514', message: 'violates check constraint' })).toBe('validation')
  })
  it('всё остальное, в том числе не-объекты и пустое — generic', () => {
    expect(errorKind({ message: 'something odd' })).toBe('generic')
    expect(errorKind('строка')).toBe('generic')
    expect(errorKind(null)).toBe('generic')
    expect(errorKind(undefined)).toBe('generic')
  })
})

describe('friendlyError', () => {
  const leaky = [
    new Error('TypeError: Failed to fetch (https://abcd1234.supabase.co/rest/v1/goals?select=*)'),
    { code: '42501', message: 'new row violates row-level security policy for table "goals"', details: 'https://abcd1234.supabase.co' },
    { code: '23503', message: 'update or delete on table "metrics" violates foreign key constraint "daily_values_metric_id_fkey" on table "daily_values"' },
    { message: 'duplicate key value violates unique constraint "goals_pkey" at https://abcd1234.supabase.co' },
  ]
  it('текст для пользователя не содержит адресов, имён таблиц и текста драйвера', () => {
    for (const e of leaky) {
      const msg = friendlyError(e)
      expect(msg.length).toBeGreaterThan(8)
      expect(msg).not.toMatch(/supabase|https?:|goals|metrics|daily_values|constraint|fetch|row-level|TypeError/i)
    }
  })
  it('подробности уходят в консоль, а не пользователю; повторный вызов без лога — по запросу', () => {
    friendlyError(leaky[0])
    expect(console.error).toHaveBeenCalledTimes(1)
    friendlyError(leaky[0], false)
    expect(console.error).toHaveBeenCalledTimes(1)
  })
  it('язык следует за site_lang', () => {
    expect(friendlyError({ message: 'Failed to fetch' }, false)).toContain('связи')
    localStorage.setItem('site_lang', 'en')
    expect(friendlyError({ message: 'Failed to fetch' }, false)).toContain('connection')
  })
})
