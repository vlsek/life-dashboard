import { beforeEach, describe, expect, it } from 'vitest'
import { COLLAPSE_STYLE_CACHE_KEY, parseCollapseStyle, readCachedCollapseStyle, writeCachedCollapseStyle } from './collapseStyle'
import { CATEGORY_ORDER, ITEMS, PRICE_TIERS, itemByKey, nextSelected, parseSelected, priceOf } from './customization'
import { rarityOfItem } from './rarity'
import { t } from './i18n'

// Вид сворачивания блоков (BACKLOG 498): предмет «аккордеон» в реестре «Кастомизации» + кэш выбора для страниц Дашборда/Workouts.
describe('вид сворачивания: предмет в реестре', () => {
  it('категория есть, предмет «аккордеон» — за баллы по среднему тарифу (150)', () => {
    expect(CATEGORY_ORDER).toContain('collapse_style')
    const it0 = itemByKey('collapse_accordion')
    expect(it0).toMatchObject({ category: 'collapse_style', source: 'points', tier: 'mid' })
    expect(priceOf(it0!)).toBe(PRICE_TIERS.mid)
    expect(PRICE_TIERS.mid).toBe(150)
  })
  it('у предмета есть редкость и названия на обоих языках', () => {
    expect(rarityOfItem('collapse_accordion')).toBe('uncommon')
    localStorage.setItem('site_lang', 'ru')
    expect(t('cust_item_collapse_accordion')).toBe('Аккордеон')
    localStorage.setItem('site_lang', 'en')
    expect(t('cust_item_collapse_accordion')).toBe('Accordion')
    expect(t('cust_cat_collapse_style').length).toBeGreaterThan(3)
  })
  it('предмет «карточка со сводкой» — за баллы по высокому тарифу (250), редкость «редкий», названия на обоих языках', () => {
    const it0 = itemByKey('collapse_summary')
    expect(it0).toMatchObject({ category: 'collapse_style', source: 'points', tier: 'high' })
    expect(priceOf(it0!)).toBe(250)
    expect(rarityOfItem('collapse_summary')).toBe('rare')
    localStorage.setItem('site_lang', 'ru')
    expect(t('cust_item_collapse_summary')).toBe('Карточка со сводкой')
    localStorage.setItem('site_lang', 'en')
    expect(t('cust_item_collapse_summary')).toBe('Summary card')
    expect(t('cust_item_collapse_summary_desc').length).toBeGreaterThan(10)
  })
  it('в категории выбирается ОДИН вид: «сводка» заменяет «аккордеон» и наоборот', () => {
    const unlocked = { collapse_accordion: { source: 'points' as const, unlockedAt: null }, collapse_summary: { source: 'points' as const, unlockedAt: null } }
    expect(nextSelected({ collapse_style: 'collapse_accordion' }, 'collapse_style', 'collapse_summary', unlocked)).toEqual({ collapse_style: 'collapse_summary' })
    expect(nextSelected({ collapse_style: 'collapse_summary' }, 'collapse_style', 'collapse_accordion', unlocked)).toEqual({ collapse_style: 'collapse_accordion' })
  })
  it('каждый предмет этой категории надевается в своей категории и снимается', () => {
    const unlocked = { collapse_accordion: { source: 'points' as const, unlockedAt: null } }
    expect(nextSelected({}, 'collapse_style', 'collapse_accordion', unlocked)).toEqual({ collapse_style: 'collapse_accordion' })
    expect(nextSelected({ collapse_style: 'collapse_accordion' }, 'collapse_style', null, unlocked)).toEqual({})
    // нельзя надеть неоткрытое и предмет чужой категории
    expect(nextSelected({}, 'collapse_style', 'collapse_accordion', {})).toEqual({})
    expect(nextSelected({}, 'avatar_frame', 'collapse_accordion', unlocked)).toEqual({})
  })
  it('рамка и вид сворачивания выбираются независимо, мусор в профиле отбрасывается', () => {
    expect(parseSelected({ avatar_frame: 'frame_neon', collapse_style: 'collapse_accordion' })).toEqual({ avatar_frame: 'frame_neon', collapse_style: 'collapse_accordion' })
    expect(parseSelected({ collapse_style: 'frame_neon' })).toEqual({})
    expect(ITEMS.every((i) => !!i.category)).toBe(true)
  })
})

describe('parseCollapseStyle / кэш', () => {
  beforeEach(() => localStorage.clear())
  it('ключ предмета → вариант; неизвестное и пустое — базовый шеврон', () => {
    expect(parseCollapseStyle('collapse_accordion')).toBe('accordion')
    expect(parseCollapseStyle('collapse_summary')).toBe('summary')
    for (const bad of [undefined, null, '', 'accordion', 'toString', 42, {}]) expect(parseCollapseStyle(bad)).toBe('chevron')
  })
  it('кэш: пишется и читается; шеврон = записи нет; мусор в кэше — шеврон', () => {
    expect(readCachedCollapseStyle()).toBe('chevron')
    writeCachedCollapseStyle('accordion')
    expect(localStorage.getItem(COLLAPSE_STYLE_CACHE_KEY)).toBe('accordion')
    expect(readCachedCollapseStyle()).toBe('accordion')
    writeCachedCollapseStyle('chevron')
    expect(localStorage.getItem(COLLAPSE_STYLE_CACHE_KEY)).toBeNull()
    localStorage.setItem(COLLAPSE_STYLE_CACHE_KEY, 'что-то')
    expect(readCachedCollapseStyle()).toBe('chevron')
  })
})
