import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { errorKind, friendlyError } from './friendlyError'

// BACKLOG раздел 35 🐞: «при удалении метрики плашка с техническим текстом и адресом Supabase… и в остальных местах».
// Пользователь никогда не видит адрес Supabase, имя таблицы и текст драйвера — только понятный текст по типу ошибки и по действию.
beforeEach(() => {
  localStorage.setItem('site_lang', 'ru')
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => vi.restoreAllMocks())

describe('errorKind', () => {
  it('сетевые сбои, нет доступа, связанные данные, неверные значения, прочее', () => {
    for (const m of ['TypeError: Failed to fetch', 'NetworkError when attempting to fetch resource.', 'Load failed', 'The request timed out']) expect(errorKind(new Error(m)), m).toBe('network')
    expect(errorKind({ code: '42501', message: 'new row violates row-level security policy for table "metrics"' })).toBe('forbidden')
    expect(errorKind({ status: 401 })).toBe('forbidden')
    expect(errorKind({ code: '23503', message: 'violates foreign key constraint' })).toBe('in_use')
    expect(errorKind({ code: '22P02', message: 'invalid input syntax for type integer' })).toBe('validation')
    expect(errorKind({ message: 'something odd' })).toBe('generic')
    expect(errorKind('Failed to fetch')).toBe('network') // агрегированные ошибки приходят строками
    expect(errorKind(null)).toBe('generic')
  })
})

describe('friendlyError', () => {
  const leaky = [
    new Error('TypeError: Failed to fetch (https://abcd1234.supabase.co/rest/v1/metrics?id=eq.1)'),
    { code: '42501', message: 'new row violates row-level security policy for table "metrics"', details: 'https://abcd1234.supabase.co' },
    { code: '23503', message: 'update or delete on table "metrics" violates foreign key constraint "daily_values_metric_id_fkey" on table "daily_values"' },
    { message: 'duplicate key value violates unique constraint "metrics_pkey" at https://abcd1234.supabase.co' },
  ]
  it('ни один текст для пользователя не содержит адресов, имён таблиц и текста драйвера — при любом действии', () => {
    for (const e of leaky)
      for (const action of ['save', 'delete', 'load', 'upload'] as const) {
        const msg = friendlyError(e, action)
        expect(msg.length).toBeGreaterThan(8)
        expect(msg).not.toMatch(/supabase|https?:|metrics|daily_values|constraint|fetch|row-level|TypeError|pkey/i)
      }
  })
  it('для «прочих» ошибок текст зависит от действия: сохранить / удалить / загрузить / загрузить файл', () => {
    const e = { message: 'something odd' }
    const texts = (['save', 'delete', 'load', 'upload'] as const).map((a) => friendlyError(e, a, false))
    expect(new Set(texts).size).toBe(4)
    expect(texts[1]).toContain('удалить')
    expect(texts[2]).toContain('загрузить данные')
    expect(texts[3]).toContain('файл')
  })
  it('связанные данные при удалении — понятная причина, а не «не получилось»', () => {
    expect(friendlyError({ code: '23503' }, 'delete', false)).toContain('используется')
  })
  it('подробности уходят в консоль; без лога — по запросу; язык по site_lang', () => {
    friendlyError(leaky[0])
    expect(console.error).toHaveBeenCalledTimes(1)
    friendlyError(leaky[0], 'save', false)
    expect(console.error).toHaveBeenCalledTimes(1)
    localStorage.setItem('site_lang', 'en')
    expect(friendlyError({ message: 'Failed to fetch' }, 'save', false)).toContain('connection')
  })
})
