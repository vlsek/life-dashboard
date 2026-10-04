import { describe, expect, it } from 'vitest'
import { filterCounts, filterItems, fmtDateRu, savingGoal, splitItems } from './shopGroups'
import type { ShopItem } from './types'

const item = (id: string, cost: number, over: Partial<ShopItem> = {}): ShopItem => ({
  id, user_id: 'u', name: id, link: null, cost, image_url: null, redeemed: false, redeemed_date: null, ...over,
})
const items = [
  item('coffee', 50, { redeemed: true, redeemed_date: '2026-09-28' }),
  item('movie', 150),
  item('book', 300),
  item('shoes', 800),
  item('trip', 2000),
  item('old', 40, { redeemed: true, redeemed_date: '2026-10-01' }),
]

describe('splitItems', () => {
  it('splits by what the balance covers; the price equal to balance is affordable', () => {
    const g = splitItems(items, 300)
    expect(g.affordable.map((i) => i.id)).toEqual(['movie', 'book'])
    expect(g.saving.map((i) => i.id)).toEqual(['shoes', 'trip'])
    expect(g.bought.map((i) => i.id)).toEqual(['old', 'coffee']) // свежие покупки сверху
  })
  it('keeps the incoming (by price) order inside groups', () => {
    expect(splitItems(items, 5000).affordable.map((i) => i.id)).toEqual(['movie', 'book', 'shoes', 'trip'])
  })
  it('balance not loaded yet: nothing is affordable, everything unbought is still "saving"', () => {
    const g = splitItems(items, null)
    expect(g.affordable).toEqual([])
    expect(g.saving).toHaveLength(4)
  })
  it('zero balance: only free items would be affordable', () => {
    const g = splitItems([item('free', 0), item('x', 10)], 0)
    expect(g.affordable.map((i) => i.id)).toEqual(['free'])
  })
})

describe('savingGoal', () => {
  it('is the nearest unaffordable item by price', () => {
    expect(savingGoal(items, 300)?.id).toBe('shoes')
    expect(savingGoal(items, 0)?.id).toBe('movie')
  })
  it('null when everything is affordable, nothing is left, or the balance is unknown', () => {
    expect(savingGoal(items, 99999)).toBeNull()
    expect(savingGoal([], 100)).toBeNull()
    expect(savingGoal(items, null)).toBeNull()
  })
})

describe('filterItems / filterCounts', () => {
  it('"all" returns every item untouched; other filters pick their group', () => {
    expect(filterItems(items, 300, 'all')).toBe(items)
    expect(filterItems(items, 300, 'affordable').map((i) => i.id)).toEqual(['movie', 'book'])
    expect(filterItems(items, 300, 'saving').map((i) => i.id)).toEqual(['shoes', 'trip'])
    expect(filterItems(items, 300, 'bought').map((i) => i.id)).toEqual(['old', 'coffee'])
  })
  it('counts match the groups', () => {
    expect(filterCounts(items, 300)).toEqual({ all: 6, affordable: 2, saving: 2, bought: 2 })
  })
})

describe('fmtDateRu', () => {
  it('formats ISO date as dd.mm.yyyy; empty for null', () => {
    expect(fmtDateRu('2026-09-28')).toBe('28.09.2026')
    expect(fmtDateRu(null)).toBe('')
  })
})
