import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CatalogModal from './CatalogModal.vue'
import { challengeTemplates } from '../lib/templates'

describe('CatalogModal', () => {
  beforeEach(() => localStorage.setItem('site_lang', 'ru'))

  it('по умолчанию показывает все шаблоны, чип категории фильтрует, у карточки два значка', async () => {
    const all = challengeTemplates()
    const w = mount(CatalogModal)
    expect(w.findAll('[data-test="catalog-card"]')).toHaveLength(all.length)
    await w.find('[data-test="chip-sport"]').trigger('click')
    const cards = w.findAll('[data-test="catalog-card"]')
    expect(cards.length).toBe(all.filter((t) => t.category === 'sport').length)
    expect(cards.length).toBeLessThan(all.length)
    expect(cards[0].findAll('.tpl-badge')).toHaveLength(2)
    expect(w.find('[data-test="chip-sport"]').attributes('aria-selected')).toBe('true')
  })

  it('клик по карточке отдаёт выбранный шаблон', async () => {
    const w = mount(CatalogModal)
    await w.find('[data-id="no_sugar_21"]').trigger('click')
    expect((w.emitted('select')![0][0] as { id: string }).id).toBe('no_sugar_21')
  })
})
