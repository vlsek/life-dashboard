import { beforeEach, describe, expect, it } from 'vitest'
import { BY_ITEM, GLASS_SHAPES, WATER_GLASS_CACHE_KEY, glassLevelY, parseWaterGlass, readCachedWaterGlass, writeCachedWaterGlass } from './waterGlass'
import { CATEGORY_ORDER, ITEMS, itemByKey, nextSelected, priceOf } from './customization'
import { rarityOfItem } from './rarity'
import { t } from './i18n'

describe('вид стакана воды (57.2б)', () => {
  beforeEach(() => localStorage.clear())

  it('предметы: кружка 100, бутылка 150, колба 150, бокал 250; категория в порядке', () => {
    expect(CATEGORY_ORDER).toContain('water_glass')
    expect(['glass_mug', 'glass_bottle', 'glass_flask', 'glass_goblet'].map((k) => priceOf(itemByKey(k)!))).toEqual([100, 150, 150, 250])
    expect(ITEMS.filter((i) => i.category === 'water_glass')).toHaveLength(12)
    expect(rarityOfItem('glass_goblet')).toBe('rare')
    expect(['glass_beaker', 'glass_pitcher'].map((k) => priceOf(itemByKey(k)!))).toEqual([150, 250])
    expect(rarityOfItem('glass_beaker')).toBe('uncommon')
    expect(['glass_carafe', 'glass_teacup'].map((k) => priceOf(itemByKey(k)!))).toEqual([150, 100])
    expect(rarityOfItem('glass_carafe')).toBe('uncommon')
    expect(rarityOfItem('glass_teacup')).toBe('common')
    // «Хайбол» 100 и «Бочонок» 150 (миграция 104)
    expect(['glass_highball', 'glass_barrel'].map((k) => priceOf(itemByKey(k)!))).toEqual([100, 150])
    expect(rarityOfItem('glass_highball')).toBe('common')
    expect(rarityOfItem('glass_barrel')).toBe('uncommon')
    expect(rarityOfItem('glass_pitcher')).toBe('rare')
  })
  it('разбор: неизвестное и пустое → обычный стакан', () => {
    expect(parseWaterGlass('glass_bottle')).toBe('bottle')
    expect(parseWaterGlass('nope')).toBe('glass')
    expect(parseWaterGlass(undefined)).toBe('glass')
    expect(parseWaterGlass('glass_beaker')).toBe('beaker')
    expect(parseWaterGlass('glass_pitcher')).toBe('pitcher')
    expect(parseWaterGlass('glass_carafe')).toBe('carafe')
    expect(parseWaterGlass('glass_teacup')).toBe('teacup')
    expect(parseWaterGlass('glass_highball')).toBe('highball')
    expect(parseWaterGlass('glass_barrel')).toBe('barrel')
    expect(Object.keys(BY_ITEM)).toHaveLength(12)
  })
  it('кэш: запись и чтение; обычный стакан кэш очищает', () => {
    writeCachedWaterGlass('flask')
    expect(readCachedWaterGlass()).toBe('flask')
    for (const k of ['beaker', 'pitcher', 'carafe', 'teacup', 'highball', 'barrel'] as const) {
      writeCachedWaterGlass(k)
      expect(readCachedWaterGlass()).toBe(k)
    }
    writeCachedWaterGlass('glass')
    expect(localStorage.getItem(WATER_GLASS_CACHE_KEY)).toBeNull()
    expect(readCachedWaterGlass()).toBe('glass')
  })
  it('уровень воды: обычный стакан — как прежняя формула; у каждой формы 0 % ниже 100 %', () => {
    for (const p of [0, 0.3, 0.5, 1]) expect(glassLevelY('glass', p)).toBeCloseTo(22.5 - p * 16.5, 5)
    for (const k of Object.keys(GLASS_SHAPES) as (keyof typeof GLASS_SHAPES)[]) {
      expect(glassLevelY(k, 0)).toBeGreaterThan(glassLevelY(k, 1))
      expect(glassLevelY(k, 2)).toBe(glassLevelY(k, 1))
    }
  })
  it('названия есть на обоих языках', () => {
    for (const k of Object.keys(BY_ITEM)) {
      expect(t(('cust_item_' + k) as never)).not.toBe('cust_item_' + k)
      expect(t(('cust_item_' + k + '_desc') as never)).not.toBe('cust_item_' + k + '_desc')
    }
  })
  it('надеть бокал: выбор хранится по категории; купленные — только свои', () => {
    const next = nextSelected({}, 'water_glass', 'glass_goblet', { glass_goblet: { source: 'points', unlockedAt: null } })
    expect(next.water_glass).toBe('glass_goblet')
  })
  it('новые формы «Хайбол» и «Бочонок»: путь внутри рамки 24×30, вода между краями, декор есть', () => {
    for (const k of ['highball', 'barrel'] as const) {
      const sh = GLASS_SHAPES[k]
      const nums = (sh.body + ' ' + sh.lines.join(' ')).match(/-?\d+(?:\.\d+)?/g)!.map(Number)
      expect(sh.top, k).toBeLessThan(sh.bottom)
      expect(sh.bottom, k).toBeLessThanOrEqual(30)
      expect(sh.top, k).toBeGreaterThanOrEqual(0)
      expect(sh.lines.length, k).toBeGreaterThan(0)
      expect(sh.body.endsWith('z') || sh.body.endsWith('Z'), k).toBe(true)
      expect(Math.max(...nums), k).toBeLessThanOrEqual(30)
    }
    expect(GLASS_SHAPES.highball.lines).toHaveLength(2) // ободок и соломинка (не деления: иначе похож на мензурку)
    expect(GLASS_SHAPES.barrel.lines).toHaveLength(3) // ободок и два обруча
  })
})
