import { describe, expect, it } from 'vitest'
import hint from './PageHint.vue?raw'

// Жалоба владельца 2026-10-10: карточка подсказки страницы была прижата к правому краю — должна быть по центру (значок «i» остаётся справа).
describe('PageHint: раскладка', () => {
  it('карточка центрируется (align-self: center), значок «i» остаётся у правого края', () => {
    const card = hint.match(/\.ph-card\s*\{[^}]*\}/)![0]
    expect(card).toMatch(/align-self:\s*center/)
    expect(hint.match(/\.ph-wrap\s*\{[^}]*\}/)![0]).toMatch(/align-items:\s*flex-end/)
  })
})
