import { describe, expect, it } from 'vitest'
import { itemByKey, priceOf } from './customization'
import { rarityOfItem } from './rarity'
import { parseWeekGauge } from './weekGauge'
import { t } from './i18n'

// Вид спидометра недели «Зубцы» (week_teeth): предмет в реестре «Кастомизации» по низкому тарифу, названия на двух языках, разбор ключа.
describe('вид недели «Зубцы»', () => {
  it('в реестре: категория, баллы, тариф low = 100, редкость «обычный»', () => {
    const it0 = itemByKey('week_teeth')
    expect(it0).toMatchObject({ category: 'week_gauge', source: 'points', tier: 'low' })
    expect(priceOf(it0!)).toBe(100)
    expect(rarityOfItem('week_teeth')).toBe('common')
  })
  it('название и описание на двух языках', () => {
    for (const lang of ['ru', 'en']) {
      localStorage.setItem('site_lang', lang)
      expect(t('cust_item_week_teeth').length).toBeGreaterThan(2)
      expect(t('cust_item_week_teeth_desc').length).toBeGreaterThan(10)
    }
  })
  it('ключ предмета → вид «зубцы»', () => expect(parseWeekGauge('week_teeth')).toBe('teeth'))
})
