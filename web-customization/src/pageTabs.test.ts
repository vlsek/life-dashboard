import { describe, expect, it } from 'vitest'
import { ALL_TAB, GROUP_ORDER, SECTION_GROUP, groupOfSection, groupsFor, migrateStoredTab, resolveTab, showsSection } from './lib/pageTabs'
import { CATEGORY_ORDER } from './lib/customization'

describe('вкладки: логика', () => {
  it('сохранённая вкладка, если она есть; иначе первая; «Все» всегда допустима', () => {
    expect(resolveTab('loading', ['look', 'loading'])).toBe('loading')
    expect(resolveTab('gone', ['look', 'loading'])).toBe('look')
    expect(resolveTab(null, ['look', 'loading'])).toBe('look')
    expect(resolveTab(ALL_TAB, ['look'])).toBe(ALL_TAB)
    expect(resolveTab(null, [])).toBe(ALL_TAB)
  })
  it('раздел показывается на вкладке своей группы и на «Все», больше нигде', () => {
    expect(showsSection('look', 'themes')).toBe(true)
    expect(showsSection('look', 'avatar_frame')).toBe(true)
    expect(showsSection('look', 'splash')).toBe(false)
    expect(showsSection('water', 'water_glass')).toBe(true)
    expect(showsSection(ALL_TAB, 'splash')).toBe(true)
  })
  it('страж 59.1: КАЖДАЯ категория каталога названа в SECTION_GROUP (новое не теряется в «Прочее» случайно)', () => {
    for (const c of CATEGORY_ORDER) expect(SECTION_GROUP[c], c).toBeTruthy()
    for (const g of Object.values(SECTION_GROUP)) expect(GROUP_ORDER).toContain(g)
  })
  it('неизвестный раздел → «Прочее»; группы идут в заданном порядке и без пустых', () => {
    expect(groupOfSection('brand_new')).toBe('other')
    expect(groupsFor(['splash', 'themes', 'brand_new', 'water_glass'])).toEqual(['look', 'water', 'loading', 'other'])
    expect(groupsFor([])).toEqual([])
  })
  it('старое сохранённое значение (id раздела) переезжает в группу', () => {
    expect(migrateStoredTab('splash')).toBe('loading')
    expect(migrateStoredTab('day_gauge')).toBe('home')
    expect(migrateStoredTab('water')).toBe('water')
    expect(migrateStoredTab('all')).toBe('all')
    expect(migrateStoredTab('мусор')).toBeNull()
    expect(migrateStoredTab(null)).toBeNull()
  })
})
