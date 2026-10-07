import { describe, expect, it } from 'vitest'
// @ts-ignore — типов node в проекте нет, vitest работает в node
import { readFileSync } from 'node:fs'

// BACKLOG 942 🐞: онбординг показывает ошибки сохранения через friendlyError (подсказки про миграции остаются отдельной строкой).
describe('onboarding: показ ошибок без сырого текста драйвера', () => {
  it('src/App.vue', () => {
    const src: string = readFileSync('src/App.vue', 'utf-8')
    expect(src).toContain('friendlyError(res.error')
    expect(src).toContain('friendlyError(res.seedError')
    expect(src).not.toMatch(/res\.error\.message|res\.seedError\.message/)
    expect(src).toContain('onb_migration_hint_001b')
    expect(src).toContain('onb_migration_hint_001')
  })
})
