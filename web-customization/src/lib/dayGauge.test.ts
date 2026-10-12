import { describe, expect, it, beforeEach } from 'vitest'
import { DAY_GAUGE_CACHE_KEY, DAY_SEGMENTS, DAY_TICKS, dayTicks, daySegments, parseDayGauge, dayRingWidths, dayGradientStops, dayUsesGradient, readCachedDayGauge, writeCachedDayGauge } from './dayGauge'
import { CATEGORY_ORDER, ITEMS, itemByKey, nextSelected, parseSelected, priceOf } from './customization'
import { rarityOfItem } from './rarity'
import { t } from './i18n'

describe('виды спидометра дня (53.2 срез 2)', () => {
  beforeEach(() => localStorage.clear())

  it('предметы в реестре: пунктирное кольцо 100, кольцо со свечением 150', () => {
    expect(CATEGORY_ORDER).toContain('day_gauge')
    expect(priceOf(itemByKey('day_dashed')!)).toBe(100)
    expect(priceOf(itemByKey('day_glow')!)).toBe(150)
    expect(priceOf(itemByKey('day_ticks')!)).toBe(150)
    expect(priceOf(itemByKey('day_gradient')!)).toBe(250)
    expect(ITEMS.filter((i) => i.category === 'day_gauge')).toHaveLength(6)
    expect(rarityOfItem('day_ticks')).toBe('uncommon')
    expect(rarityOfItem('day_gradient')).toBe('rare')
    expect(rarityOfItem('day_dashed')).toBe('common')
    expect(rarityOfItem('day_glow')).toBe('uncommon')
  })

  it('есть названия и описания, категория названа', () => {
    expect(t('cust_cat_day_gauge').length).toBeGreaterThan(3)
    for (const k of ['day_dashed', 'day_glow', 'day_ticks', 'day_gradient']) {
      expect(t(('cust_item_' + k) as never)).not.toBe('cust_item_' + k)
      expect(t(('cust_item_' + k + '_desc') as never)).not.toBe('cust_item_' + k + '_desc')
    }
  })

  it('разбор ключа: неизвестное и пустое — обычное кольцо', () => {
    expect(parseDayGauge('day_dashed')).toBe('dashed')
    expect(parseDayGauge('day_glow')).toBe('glow')
    expect(parseDayGauge('day_ticks')).toBe('ticks')
    expect(parseDayGauge('day_gradient')).toBe('gradient')
    expect(parseDayGauge('week_bars')).toBe('ring')
    expect(parseDayGauge(undefined)).toBe('ring')
    expect(parseDayGauge('toString')).toBe('ring')
  })

  it('кэш: пишется и читается, обычное кольцо стирает ключ', () => {
    writeCachedDayGauge('glow')
    expect(readCachedDayGauge()).toBe('glow')
    writeCachedDayGauge('ring')
    expect(localStorage.getItem(DAY_GAUGE_CACHE_KEY)).toBeNull()
    localStorage.setItem(DAY_GAUGE_CACHE_KEY, 'мусор')
    expect(readCachedDayGauge()).toBe('ring')
  })

  it('выбор хранится в customization.day_gauge, купленное выбирается', () => {
    expect(parseSelected({ day_gauge: 'day_glow' })).toEqual({ day_gauge: 'day_glow' })
    expect(parseSelected({ day_gauge: 'week_bars' })).toEqual({})
    expect(nextSelected({}, 'day_gauge', 'day_glow', { day_glow: { source: 'points', unlockedAt: null } })).toEqual({ day_gauge: 'day_glow' })
    expect(nextSelected({}, 'day_gauge', 'day_glow', {})).toEqual({})
  })

  it('сегменты: 20 дуг, закрашено round(доля·20), минимум одна при прогрессе > 0', () => {
    const lit = (b: number, bonus = 0) => daySegments(26, 26, 24, b, bonus).filter((s) => s.base).length
    expect(daySegments(26, 26, 24, 0.5, 0)).toHaveLength(DAY_SEGMENTS)
    expect(lit(0)).toBe(0)
    expect(lit(0.01)).toBe(1)
    expect(lit(0.5)).toBe(10)
    expect(lit(1)).toBe(20)
    expect(lit(3)).toBe(20)
    expect(daySegments(26, 26, 24, 0.5, 40).filter((s) => s.bonus)).toHaveLength(8)
    expect(daySegments(26, 26, 24, 0.5, 0).every((s) => !s.bonus)).toBe(true)
  })

  it('кэш помнит «циферблат» и «градиент»', () => {
    writeCachedDayGauge('ticks')
    expect(readCachedDayGauge()).toBe('ticks')
    writeCachedDayGauge('gradient')
    expect(readCachedDayGauge()).toBe('gradient')
  })

  it('циферблат: 12 штрихов, горят те, что внутри пройденной доли', () => {
    expect(dayTicks(16, 16, 13, 0.5)).toHaveLength(DAY_TICKS)
    const lit = (b: number) => dayTicks(16, 16, 13, b).filter((t0) => t0.lit).length
    expect(lit(0)).toBe(0)
    expect(lit(0.5)).toBe(6)
    expect(lit(1)).toBe(12)
    expect(lit(5)).toBe(12)
    const first = dayTicks(16, 16, 13, 1)[0]
    expect(first.x1).toBeGreaterThan(first.x2) // штрих идёт внутрь кольца
  })

  it('срез 4: «Толстое кольцо» и «Радуга» — предметы, виды, толщина и градиент', () => {
    expect(priceOf(itemByKey('day_thick')!)).toBe(100)
    expect(priceOf(itemByKey('day_rainbow')!)).toBe(250)
    expect(parseDayGauge('day_thick')).toBe('thick')
    expect(parseDayGauge('day_rainbow')).toBe('rainbow')
    expect(dayRingWidths('thick').arc).toBeGreaterThan(dayRingWidths('ring').arc)
    expect(dayRingWidths('ticks').arc).toBeLessThan(dayRingWidths('ring').arc)
    expect(dayGradientStops('rainbow')).toHaveLength(4)
    expect(dayGradientStops('rainbow')[3].offset).toBe('100%')
    expect(dayGradientStops('gradient')).toHaveLength(2)
    expect(dayUsesGradient('rainbow') && dayUsesGradient('gradient') && !dayUsesGradient('thick')).toBe(true)
  })
})
