import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ItemProgressBar from './ItemProgressBar.vue'

describe('ItemProgressBar', () => {
  it('shows a percentage and a bar width while the item is not affordable', () => {
    const w = mount(ItemProgressBar, { props: { cost: 200, balance: 50 } })
    expect(w.find('[role="progressbar"]').attributes('aria-valuenow')).toBe('25')
    expect(w.find('[data-testid="item-progress-label"]').text()).toBe('25%')
    expect((w.find('[role="progressbar"] > div').element as HTMLElement).style.width).toBe('25%')
  })
  it('says the item can be bought once the price is reached', () => {
    const w = mount(ItemProgressBar, { props: { cost: 100, balance: 100 } })
    expect(w.find('[role="progressbar"]').attributes('aria-valuenow')).toBe('100')
    expect(w.find('[data-testid="item-progress-label"]').text()).toMatch(/Enough to buy|Хватает на покупку/)
  })
})
