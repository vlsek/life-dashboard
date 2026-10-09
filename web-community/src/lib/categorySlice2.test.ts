import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CATEGORY_STORAGE_KEY, initialCategoryKey, loadCategoryKey, modeValue, myCategoryPlace, saveCategoryKey } from './category'

const r = (o: Partial<{ total_value: number; category_points: number; category_streak: number }>) => ({ total_value: 0, category_points: 0, category_streak: 0, ...o })

describe('modeValue', () => {
  it('главное число зависит от режима', () => {
    const row = r({ total_value: 120, category_points: 7, category_streak: 3 })
    expect(modeValue(row, 'value')).toBe(120)
    expect(modeValue(row, 'points')).toBe(7)
    expect(modeValue(row, 'streak')).toBe(3)
  })
})

describe('myCategoryPlace', () => {
  const rows = [{ user_id: 'a' }, { user_id: 'me' }, { user_id: 'c' }]
  it('место и размер списка', () => expect(myCategoryPlace(rows, 'me')).toEqual({ rank: 2, total: 3 }))
  it('нас в списке нет → null', () => expect(myCategoryPlace(rows, 'zzz')).toBeNull())
  it('пустой список → null', () => expect(myCategoryPlace([], 'me')).toBeNull())
})

describe('initialCategoryKey', () => {
  const cats = [{ key: 'pushups' }, { key: 'water' }]
  it('запомненная категория, если она ещё есть', () => expect(initialCategoryKey(cats, 'water')).toBe('water'))
  it('запомненной уже нет → первая', () => expect(initialCategoryKey(cats, 'gone')).toBe('pushups'))
  it('ничего не запомнено → первая', () => expect(initialCategoryKey(cats, null)).toBe('pushups'))
  it('категорий нет → пустая строка', () => expect(initialCategoryKey([], 'water')).toBe(''))
})

describe('запоминание категории', () => {
  beforeEach(() => localStorage.clear())
  it('пишется и читается', () => {
    saveCategoryKey('water')
    expect(localStorage.getItem(CATEGORY_STORAGE_KEY)).toBe('water')
    expect(loadCategoryKey()).toBe('water')
  })
  it('сбой хранилища не ломает', () => {
    const a = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied') })
    const b = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied') })
    expect(loadCategoryKey()).toBeNull()
    expect(() => saveCategoryKey('x')).not.toThrow()
    a.mockRestore(); b.mockRestore()
  })
})
