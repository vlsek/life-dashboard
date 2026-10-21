import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SHOP_VIEW, SHOP_VIEW_KEY, loadShopView, parseShopView, saveShopView } from './shopView'

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('shop view preference', () => {
  it('defaults to the goal view', () => {
    expect(DEFAULT_SHOP_VIEW).toBe('focus')
    expect(loadShopView()).toBe('focus')
  })
  it('round-trips all views', () => {
    saveShopView('list')
    expect(localStorage.getItem(SHOP_VIEW_KEY)).toBe('list')
    expect(loadShopView()).toBe('list')
    saveShopView('grid')
    expect(loadShopView()).toBe('grid')
    saveShopView('focus')
    expect(loadShopView()).toBe('focus')
  })
  it('a garbage stored value falls back to the default', () => {
    expect(parseShopView('table')).toBe('focus')
    expect(parseShopView(null)).toBe('focus')
    localStorage.setItem(SHOP_VIEW_KEY, 'nonsense')
    expect(loadShopView()).toBe('focus')
  })
  it('unavailable storage never throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied')
    })
    expect(loadShopView()).toBe('focus')
    expect(() => saveShopView('list')).not.toThrow()
  })
})
