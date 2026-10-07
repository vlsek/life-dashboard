import { describe, expect, it } from 'vitest'
// @ts-ignore — типов node в проекте нет, vitest работает в node
import { readFileSync } from 'node:fs'

// BACKLOG 942 🐞: показ ошибок загрузки идёт через friendlyError — текст драйвера, адрес Supabase и имена таблиц до человека не доходят.
describe('history: ошибки загрузки показываются через friendlyError', () => {
  for (const f of ['src/lib/useHistoryData.ts'] as string[]) {
    it(f, () => {
      const src: string = readFileSync(f, 'utf-8')
      expect(src).toContain('friendlyError(')
      expect(src).not.toMatch(/error\.value = (err|e|error)\.message/)
      expect(src).not.toMatch(/error: error\.message/)
      expect(src).not.toContain('(e as Error).message')
    })
  }
})
