import { describe, expect, it } from 'vitest'
// @ts-ignore — типов node в проекте нет, vitest работает в node
import { readFileSync } from 'node:fs'

// BACKLOG 942 🐞: ошибки сообщества показываются через friendlyError — текст драйвера, адрес Supabase и имена таблиц до человека не доходят.
describe('community: показ ошибок без сырого текста драйвера', () => {
  for (const f of ['src/App.vue', 'src/components/CategorySection.vue', 'src/lib/useCommunity.ts', 'src/lib/useCategories.ts'] as string[]) {
    it(f, () => {
      const src: string = readFileSync(f, 'utf-8')
      expect(src).toContain('friendlyError(')
      expect(src).not.toMatch(/(err|error|insErr) instanceof Error \? (err|error)\.message/)
      expect(src).not.toMatch(/(Error|error|Msg|value) = (error|err)\.message/)
      expect(src).not.toMatch(/message: (error|err|insErr)\.message/)
      expect(src).not.toContain('String(err)')
    })
  }
})
