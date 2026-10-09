import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_TAB, TAB_STORAGE_KEY, TABS, isTab, loadTab, saveTab } from './tabs'

describe('вкладки «Сообщества»', () => {
  beforeEach(() => localStorage.clear())
  it('по умолчанию «Рейтинг», порядок вкладок фиксирован', () => {
    expect(DEFAULT_TAB).toBe('rating')
    expect([...TABS]).toEqual(['rating', 'feed', 'friends', 'compare'])
    expect(loadTab()).toBe('rating')
  })
  it('сохраняется и читается', () => {
    saveTab('friends')
    expect(localStorage.getItem(TAB_STORAGE_KEY)).toBe('friends')
    expect(loadTab()).toBe('friends')
  })
  it('мусор в хранилище → вкладка по умолчанию', () => {
    for (const bad of ['', 'nope', '{}', 'RATING']) {
      localStorage.setItem(TAB_STORAGE_KEY, bad)
      expect(loadTab()).toBe('rating')
    }
    expect(isTab(5)).toBe(false)
  })
  it('сбой хранилища не ломает ни чтение, ни запись', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied') })
    const spy2 = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied') })
    expect(loadTab()).toBe('rating')
    expect(() => saveTab('feed')).not.toThrow()
    spy.mockRestore(); spy2.mockRestore()
  })
})
