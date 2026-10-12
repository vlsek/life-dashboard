import { describe, expect, it } from 'vitest'
import source from './App.vue?raw'

// BACKLOG 60.2 п.2: на странице нет ссылки на классическую версию (/legacy/…).
describe('нет ссылки на legacy', () => {
  it('в App.vue нет адресов /legacy/ и подписи legacy-…', () => {
    expect(source).not.toContain('/legacy/')
    expect(source).not.toMatch(/legacy-(login|onboarding)/)
  })
})
