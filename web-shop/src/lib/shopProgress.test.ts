import { describe, expect, it } from 'vitest'
import { itemProgress } from './shopProgress'

describe('itemProgress', () => {
  it('shows the share of the price already collected', () => {
    expect(itemProgress(200, 50)).toEqual({ pct: 25, canBuy: false, missing: 150 })
  })
  it('is 100% and buyable once the balance reaches the price', () => {
    expect(itemProgress(100, 100)).toEqual({ pct: 100, canBuy: true, missing: 0 })
    expect(itemProgress(100, 340)).toEqual({ pct: 100, canBuy: true, missing: 0 })
  })
  it('never rounds up to 100% while the item is still unaffordable', () => {
    expect(itemProgress(1000, 999).pct).toBe(99)
  })
  it('treats a negative balance as zero', () => {
    expect(itemProgress(100, -20)).toEqual({ pct: 0, canBuy: false, missing: 100 })
  })
  it('treats a free or invalid price as immediately buyable', () => {
    expect(itemProgress(0, 0).canBuy).toBe(true)
    expect(itemProgress(NaN, 5).pct).toBe(100)
  })
})
