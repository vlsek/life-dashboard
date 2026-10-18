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

describe('вид сворачивания: «Точка» и «Двойная стрелка»', () => {
  it('предметы в реестре по низкому тарифу (100), редкость «обычный», названия и описания на двух языках', () => {
    for (const key of ['collapse_dot', 'collapse_double']) {
      const it0 = itemByKey(key)
      expect(it0).toMatchObject({ category: 'collapse_style', source: 'points', tier: 'low' })
      expect(priceOf(it0!)).toBe(100)
      expect(rarityOfItem(key)).toBe('common')
      for (const lang of ['ru', 'en']) {
        localStorage.setItem('site_lang', lang)
        expect(t(('cust_item_' + key) as never).length).toBeGreaterThan(2)
        expect(t(('cust_item_' + key + '_desc') as never).length).toBeGreaterThan(10)
      }
    }
  })
  it('ключ предмета превращается в вид маркера', () => {
    expect(parseCollapseStyle('collapse_dot')).toBe('dot')
    expect(parseCollapseStyle('collapse_double')).toBe('double')
  })
  it('кэш помнит новые виды', () => {
    writeCachedCollapseStyle('dot')
    expect(readCachedCollapseStyle()).toBe('dot')
    writeCachedCollapseStyle('double')
    expect(readCachedCollapseStyle()).toBe('double')
    writeCachedCollapseStyle('chevron')
  })
})

describe('вид сворачивания: «Квадрат» и «Гамбургер»', () => {
  it('цены 100 и 150, редкость, названия и описания на двух языках', () => {
    expect(priceOf(itemByKey('collapse_square')!)).toBe(100)
    expect(priceOf(itemByKey('collapse_burger')!)).toBe(150)
    expect(rarityOfItem('collapse_square')).toBe('common')
    expect(rarityOfItem('collapse_burger')).toBe('uncommon')
    for (const key of ['collapse_square', 'collapse_burger']) {
      expect(itemByKey(key)).toMatchObject({ category: 'collapse_style', source: 'points' })
      for (const lang of ['ru', 'en']) {
        localStorage.setItem('site_lang', lang)
        expect(t(('cust_item_' + key) as never).length).toBeGreaterThan(2)
        expect(t(('cust_item_' + key + '_desc') as never).length).toBeGreaterThan(10)
      }
    }
  })
  it('ключ предмета → вид маркера; кэш помнит оба', () => {
    expect(parseCollapseStyle('collapse_square')).toBe('square')
    expect(parseCollapseStyle('collapse_burger')).toBe('burger')
    for (const s of ['square', 'burger'] as const) {
      writeCachedCollapseStyle(s)
      expect(readCachedCollapseStyle()).toBe(s)
    }
    writeCachedCollapseStyle('chevron')
  })
})

describe('вид сворачивания: «Длинная стрелка» и «Кольцо»', () => {
  it('цены 100 и 150, редкость, названия и описания на двух языках', () => {
    expect(priceOf(itemByKey('collapse_arrow')!)).toBe(100)
    expect(priceOf(itemByKey('collapse_ring')!)).toBe(150)
    expect(rarityOfItem('collapse_arrow')).toBe('common')
    expect(rarityOfItem('collapse_ring')).toBe('uncommon')
    for (const key of ['collapse_arrow', 'collapse_ring']) {
      expect(itemByKey(key)).toMatchObject({ category: 'collapse_style', source: 'points' })
      for (const lang of ['ru', 'en']) {
        localStorage.setItem('site_lang', lang)
        expect(t(('cust_item_' + key) as never).length).toBeGreaterThan(2)
        expect(t(('cust_item_' + key + '_desc') as never).length).toBeGreaterThan(10)
      }
    }
  })
  it('ключ предмета → вид маркера; кэш помнит оба', () => {
    expect(parseCollapseStyle('collapse_arrow')).toBe('arrow')
    expect(parseCollapseStyle('collapse_ring')).toBe('ring')
    for (const s of ['arrow', 'ring'] as const) {
      writeCachedCollapseStyle(s)
      expect(readCachedCollapseStyle()).toBe(s)
    }
    writeCachedCollapseStyle('chevron')
  })
})
