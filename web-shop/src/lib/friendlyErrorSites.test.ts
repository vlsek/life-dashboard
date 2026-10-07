import { describe, expect, it } from 'vitest'
// @ts-ignore — типов node в проекте нет, vitest работает в node
import { readFileSync } from 'node:fs'

// BACKLOG 942 🐞: ошибки показываются через friendlyError/authErrorText — текст драйвера, адрес Supabase и имена таблиц до человека не доходят.
describe('shop: показ ошибок без сырого текста драйвера', () => {
  for (const f of ['src/lib/useShop.ts', 'src/lib/fetchAll.ts'] as string[]) {
    it(f, () => {
      const src: string = readFileSync(f, 'utf-8')
      expect(src).toMatch(/friendlyError\(|authErrorText\(/)
      expect(src).not.toMatch(/error\.value = (err|e|error)\.message/)
      expect(src).not.toMatch(/error: error\.message/)
      expect(src).not.toMatch(/\+ (errMsg\(e\)|error\.message|err\.message|m \+)/)
    })
  }
})

import { fetchAllRows } from './fetchAll'
describe('fetchAllRows (магазин): сбой чтения', () => {
  it('в error — понятный текст без адреса Supabase', async () => {
    localStorage.setItem('site_lang', 'ru')
    const r = await fetchAllRows(() => Promise.resolve({ data: null, error: { message: 'TypeError: Failed to fetch (https://abcd1234.supabase.co/rest/v1/shop_items)' } }))
    expect(r.error).toBe('Нет связи с сервером. Проверь интернет и попробуй ещё раз.')
  })
})
