import { describe, expect, it } from 'vitest'
import { filterCounts, savingGoal, splitItems } from './lib/shopGroups'
import type { ShopItem } from './lib/types'

// BACKLOG 68.2: награды за цель в группах магазина не зависят от баланса и не становятся «целью накопления».
const it_ = (id: string, cost: number, over: Partial<ShopItem> = {}): ShopItem => ({ id, user_id: 'u', name: id, link: null, cost, image_url: null, redeemed: false, redeemed_date: null, ...over })
const rw = (status: 'in_progress' | 'ready' | 'claimed') => ({ status, goalName: 'Цель', progress: { done: 1, total: 2 } })

describe('splitItems с наградами за цель', () => {
  const items = [it_('a', 0, { reward: rw('ready') }), it_('b', 0, { reward: rw('in_progress') }), it_('c', 50), it_('d', 900)]
  it('готовая награда — «можно получить» при любом балансе (даже 0), ожидающая — «копится»', () => {
    for (const bal of [0, 100, 5000, null]) {
      const g = splitItems(items, bal)
      expect(g.affordable.map((i) => i.id)).toContain('a')
      expect(g.saving.map((i) => i.id)).toContain('b')
    }
  })
  it('цена 0 у награды не делает её доступной по балансу', () => {
    const g = splitItems([it_('x', 0, { reward: rw('in_progress') })], 9999)
    expect(g.affordable).toHaveLength(0)
    expect(g.saving).toHaveLength(1)
  })
  it('цель накопления — только вещь за огоньки, награды за цель пропускаются', () => {
    expect(savingGoal(items, 100)?.id).toBe('d')
    expect(savingGoal([it_('b', 0, { reward: rw('in_progress') })], 100)).toBeNull()
  })
  it('полученная награда — в «купленных»; счётчики сходятся', () => {
    const all = [...items, it_('e', 0, { redeemed: true, redeemed_date: '2026-10-01', reward: rw('claimed') })]
    const g = splitItems(all, 100)
    expect(g.bought.map((i) => i.id)).toEqual(['e'])
    expect(filterCounts(all, 100)).toEqual({ all: 5, affordable: 2, saving: 2, bought: 1 })
  })
})
