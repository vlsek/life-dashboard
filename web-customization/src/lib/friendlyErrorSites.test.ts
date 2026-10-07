import { describe, expect, it } from 'vitest'
// @ts-ignore — типов node в проекте нет, vitest работает в node
import { readFileSync } from 'node:fs'

// BACKLOG 942 🐞: показ ошибок загрузки идёт через friendlyError — текст драйвера, адрес Supabase и имена таблиц до человека не доходят.
describe('customization: ошибки загрузки показываются через friendlyError', () => {
  for (const f of ['src/lib/fetchAll.ts', 'src/lib/useCustomization.ts'] as string[]) {
    it(f, () => {
      const src: string = readFileSync(f, 'utf-8')
      expect(src).toContain('friendlyError(')
      expect(src).not.toMatch(/error\.value = (err|e|error)\.message/)
      expect(src).not.toMatch(/error: error\.message/)
      expect(src).not.toContain('(e as Error).message')
    })
  }
})

import { fetchAllRows } from './fetchAll'
describe('fetchAllRows: сбой чтения', () => {
  it('в error уходит понятный текст без адреса Supabase и имени таблицы', async () => {
    localStorage.setItem('site_lang', 'ru')
    const r = await fetchAllRows(() => Promise.resolve({ data: null, error: { message: 'TypeError: Failed to fetch (https://abcd1234.supabase.co/rest/v1/daily_values)' } }))
    expect(r.error).toBe('Нет связи с сервером. Проверь интернет и попробуй ещё раз.')
    expect(r.rows).toEqual([])
  })
})
