import { describe, expect, it } from 'vitest'
import { fetchAllRows } from './fetchAll'

// BACKLOG 942: сбой чтения в шапке — понятный текст без адреса Supabase и имени таблицы.
describe('fetchAllRows (шапка): сбой чтения', () => {
  it('в error уходит понятный текст', async () => {
    localStorage.setItem('site_lang', 'ru')
    const r = await fetchAllRows(() => Promise.resolve({ data: null, error: { message: 'TypeError: Failed to fetch (https://abcd1234.supabase.co/rest/v1/daily_values)' } }))
    expect(r.error).toBe('Нет связи с сервером. Проверь интернет и попробуй ещё раз.')
    expect(r.rows).toEqual([])
  })
})
