import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SHOP_VIEW, SHOP_VIEW_KEY, loadShopView, parseShopView, saveShopView } from './shopView'

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('shop view preference', () => {
  it('defaults to the showcase', () => {
    expect(DEFAULT_SHOP_VIEW).toBe('grid')
    expect(loadShopView()).toBe('grid')
  })
  it('round-trips both views', () => {
    saveShopView('list')
    expect(localStorage.getItem(SHOP_VIEW_KEY)).toBe('list')
    expect(loadShopView()).toBe('list')
    saveShopView('grid')
    expect(loadShopView()).toBe('grid')
  })
  it('a garbage stored value falls back to the default', () => {
    expect(parseShopView('table')).toBe('grid')
    expect(parseShopView(null)).toBe('grid')
    localStorage.setItem(SHOP_VIEW_KEY, 'nonsense')
    expect(loadShopView()).toBe('grid')
  })
  it('unavailable storage never throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied')
    })
    expect(loadShopView()).toBe('grid')
    expect(() => saveShopView('list')).not.toThrow()
  })
})
