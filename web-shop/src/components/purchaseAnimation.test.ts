import { describe, expect, it, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в brandFlame.test.ts).
import { readFileSync } from 'node:fs'
import BalanceCard from './BalanceCard.vue'

const bal = (n: number) => ({ total: 500, spent: 500 - n, balance: n })

describe('purchase animation (67.2 slice 4)', () => {
  afterEach(() => vi.useRealTimers())

  it('shows a floating "−N" and marks the card when the balance drops, then clears it', async () => {
    vi.useFakeTimers()
    const w = mount(BalanceCard, { props: { balance: bal(300), variant: 'grid' } })
    expect(w.find('[data-testid="balance-delta"]').exists()).toBe(false)
    await w.setProps({ balance: bal(240) })
    expect(w.find('[data-testid="balance-delta"]').text()).toBe('−60')
    expect(w.find('[data-testid="balance-card"]').classes()).toContain('balance-spent')
    vi.advanceTimersByTime(1500)
    await w.vm.$nextTick()
    expect(w.find('[data-testid="balance-delta"]').exists()).toBe(false)
  })

  it('stays quiet when the balance grows or the first value arrives', async () => {
    const w = mount(BalanceCard, { props: { balance: null, variant: 'list' } })
    await w.setProps({ balance: bal(100) })
    expect(w.find('[data-testid="balance-delta"]').exists()).toBe(false)
    await w.setProps({ balance: bal(150) })
    expect(w.find('[data-testid="balance-delta"]').exists()).toBe(false)
  })

  it('works in every view variant', async () => {
    for (const variant of ['grid', 'list', 'compact'] as const) {
      const w = mount(BalanceCard, { props: { balance: bal(90), variant } })
      await w.setProps({ balance: bal(40) })
      expect(w.find('[data-testid="balance-delta"]').text()).toBe('−50')
    }
  })

  it('has a burst on the bought toast and switches motion off for reduced-motion users', () => {
    const app = readFileSync('src/App.vue', 'utf-8') as string
    expect(app).toContain('data-testid="bought-burst"')
    const css = readFileSync('src/style.css', 'utf-8') as string
    const tail = css.slice(css.indexOf('Анимация покупки (67.2)'))
    expect(tail).toMatch(/prefers-reduced-motion: reduce\)[\s\S]*\.bought-burst \{ display: none \}/)
  })
})
