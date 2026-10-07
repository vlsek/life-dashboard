import { describe, expect, it } from 'vitest'
// @ts-ignore — типов node в проекте нет, vitest работает в node
import { readFileSync } from 'node:fs'

// BACKLOG 942 🐞: ошибки показываются через friendlyError/authErrorText — текст драйвера, адрес Supabase и имена таблиц до человека не доходят.
describe('workouts: показ ошибок без сырого текста драйвера', () => {
  for (const f of ['src/App.vue'] as string[]) {
    it(f, () => {
      const src: string = readFileSync(f, 'utf-8')
      expect(src).toMatch(/friendlyError\(|authErrorText\(/)
      expect(src).not.toMatch(/error\.value = (err|e|error)\.message/)
      expect(src).not.toMatch(/error: error\.message/)
      expect(src).not.toMatch(/\+ (errMsg\(e\)|error\.message|err\.message|m \+)/)
    })
  }
})
