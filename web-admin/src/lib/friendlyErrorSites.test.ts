import { describe, expect, it } from 'vitest'
// @ts-ignore — типов node в проекте нет, vitest работает в node
import { readFileSync } from 'node:fs'

// BACKLOG 942 🐞: показ ошибок загрузки идёт через friendlyError — текст драйвера, адрес Supabase и имена таблиц до человека не доходят.
describe('admin: ошибки загрузки показываются через friendlyError', () => {
  for (const f of ['src/lib/useAdmin.ts'] as string[]) {
    it(f, () => {
      const src: string = readFileSync(f, 'utf-8')
      expect(src).toContain('friendlyError(')
      expect(src).not.toMatch(/error\.value = (err|e|error)\.message/)
      expect(src).not.toMatch(/error: error\.message/)
      expect(src).not.toContain('(e as Error).message')
    })
  }
  // Админка раньше печатала error.message в карточку и в тост («Не удалось удалить: <текст драйвера>») — теперь App.vue ничего сырого не показывает.
  it('src/App.vue не выводит сырой текст ошибки', () => {
    const src: string = readFileSync('src/App.vue', 'utf-8')
    expect(src).not.toMatch(/\.message/)
    expect(src).not.toContain('{{ error.message')
  })
})
