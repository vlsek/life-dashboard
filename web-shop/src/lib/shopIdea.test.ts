import { afterEach, describe, expect, it, vi } from 'vitest'
import { SHOP_IDEA_SEEN_KEY, loadIdeaSeen, saveIdeaSeen } from './shopIdea'

afterEach(() => {
  localStorage.removeItem(SHOP_IDEA_SEEN_KEY)
  vi.restoreAllMocks()
})

describe('флаг «плашку про идею магазина уже видели»', () => {
  it('по умолчанию не видели; после сохранения — видели; ключ именно shop_idea_seen', () => {
    expect(loadIdeaSeen()).toBe(false)
    saveIdeaSeen()
    expect(localStorage.getItem('shop_idea_seen')).toBe('1')
    expect(loadIdeaSeen()).toBe(true)
  })

  it('посторонние значения не считаются «видели»', () => {
    for (const v of ['', '0', 'true', 'yes']) {
      localStorage.setItem(SHOP_IDEA_SEEN_KEY, v)
      expect(loadIdeaSeen(), v).toBe(false)
    }
  })

  it('недоступный localStorage: чтение — «не видели» (покажем плашку), запись не падает', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied')
    })
    expect(loadIdeaSeen()).toBe(false)
    expect(() => saveIdeaSeen()).not.toThrow()
  })
})
