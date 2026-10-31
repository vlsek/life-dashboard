import { beforeEach, describe, expect, it } from 'vitest'
import { NO_COMPETE_KEY, TABS, effectiveTab, loadNoCompete, saveNoCompete, tabsFor } from './lib/tabs'
import CommunityTabs from './components/CommunityTabs.vue'
import { mount } from '@vue/test-utils'

// BACKLOG 78.4: «Без соревнований» — скрывает «Рейтинг» и «Сравнение», оставляет «Ленту» и «Друзей»
beforeEach(() => localStorage.clear())

describe('без соревнований: вкладки и хранение', () => {
  it('выключено — все вкладки; включено — только «Лента» и «Друзья»', () => {
    expect(tabsFor(false)).toEqual([...TABS])
    expect(tabsFor(true)).toEqual(['feed', 'friends'])
  })
  it('соревновательная вкладка при включённом режиме заменяется на «Ленту», остальные не трогаем', () => {
    expect(effectiveTab('rating', true)).toBe('feed')
    expect(effectiveTab('compare', true)).toBe('feed')
    expect(effectiveTab('friends', true)).toBe('friends')
    expect(effectiveTab('rating', false)).toBe('rating')
  })
  it('выбор запоминается и снимается; сбой хранилища не ломает', () => {
    expect(loadNoCompete()).toBe(false)
    saveNoCompete(true)
    expect(localStorage.getItem(NO_COMPETE_KEY)).toBe('1')
    expect(loadNoCompete()).toBe(true)
    saveNoCompete(false)
    expect(localStorage.getItem(NO_COMPETE_KEY)).toBeNull()
    expect(loadNoCompete()).toBe(false)
  })
  it('полоса вкладок рисует только переданные', () => {
    const w = mount(CommunityTabs, { props: { modelValue: 'feed', tabs: tabsFor(true) } })
    expect(w.findAll('[data-testid="comm-tab"]').map((b) => b.attributes('data-tab'))).toEqual(['feed', 'friends'])
    expect(mount(CommunityTabs, { props: { modelValue: 'rating' } }).findAll('[data-testid="comm-tab"]')).toHaveLength(4)
  })
})
