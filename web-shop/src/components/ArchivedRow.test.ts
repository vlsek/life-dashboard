import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ArchivedRow from './ArchivedRow.vue'
import { coinsToSparksSuggestion } from '../lib/sparks'
import type { ShopItem } from '../lib/types'

// BACKLOG 48.4 (просьба владельца 2026-10-08): в архивной вещи не пишем, сколько она стоила в монетах.
const item = { id: 'i1', name: 'Кофе', cost: 80 } as unknown as ShopItem

describe('ArchivedRow: строка архивной вещи', () => {
  it('не показывает прежнюю цену в монетах: ни слова «было»/«was», ни числа 80, ни значка монеты', () => {
    const w = mount(ArchivedRow, { props: { item } })
    const text = w.text()
    expect(text).toContain('Кофе')
    expect(text).not.toMatch(/было|was/i)
    expect(text).not.toContain('80')
    expect(w.find('svg.coin-icon').exists()).toBe(false)
  })

  it('поле цены в огоньках и кнопка переноса на месте; в поле — подсказка 1/8 от монет, перенос шлёт id и цену', async () => {
    const w = mount(ArchivedRow, { props: { item } })
    const input = w.find('[data-testid="archived-price"]')
    expect((input.element as HTMLInputElement).value).toBe(String(coinsToSparksSuggestion(80)))
    await input.setValue('15')
    await w.find('[data-testid="archived-transfer"]').trigger('click')
    expect(w.emitted('transfer')).toEqual([['i1', 15]])
  })
})
