import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ItemCard from './components/ItemCard.vue'
import { ITEMS, priceOf } from './lib/customization'
import { rarityOfItem } from './lib/rarity'
import { parseWeekGauge } from './lib/weekGauge'
import { t } from './lib/i18n'

// Платные виды спидометра недели как предметы «Кастомизации» (BACKLOG 53.2/59.3/59.4): состав, цены, редкость, вид из ключа, превью и описания.
const week = ITEMS.filter((i) => i.category === 'week_gauge')
const card = (key: string) => mount(ItemCard, { props: { item: ITEMS.find((i) => i.key === key)!, status: 'buyable', balance: 1000, busy: false, disabled: false } })

describe('предметы «Вид недели»', () => {
  it('двенадцать предметов; новые «Пик», «Пила», «Башни» (100) и «Выходные» (150)', () => {
    expect(week.map((i) => i.key)).toEqual(['week_classic', 'week_bars', 'week_dots', 'week_steps', 'week_wave', 'week_teeth', 'week_valley', 'week_slope', 'week_peak', 'week_saw', 'week_towers', 'week_weekend'])
    expect(week.map(priceOf).slice(-4)).toEqual([100, 150, 100, 150])
    expect(rarityOfItem('week_peak')).toBe('common')
    expect(rarityOfItem('week_saw')).toBe('uncommon')
    expect(rarityOfItem('week_valley')).toBe('uncommon')
    expect(rarityOfItem('week_slope')).toBe('common')
  })
  it('вид из ключа: каждый предмет реестра соответствует виду недели', () => {
    expect(parseWeekGauge('week_valley')).toBe('valley')
    expect(parseWeekGauge('week_slope')).toBe('slope')
    expect(parseWeekGauge('week_peak')).toBe('peak')
    expect(parseWeekGauge('week_saw')).toBe('saw')
    expect(parseWeekGauge('week_towers')).toBe('towers')
    expect(parseWeekGauge('week_weekend')).toBe('weekend')
    for (const i of week) expect(parseWeekGauge(i.key), i.key).not.toBe('heptagon')
  })
  it('карточка рисует превью своего вида и показывает название и описание на двух языках', () => {
    for (const lang of ['ru', 'en']) {
      localStorage.setItem('site_lang', lang)
      for (const key of ['week_valley', 'week_slope', 'week_peak', 'week_saw', 'week_towers', 'week_weekend']) {
        const w = card(key)
        expect(w.find(`[data-testid="week-preview-${key.replace('week_', '')}"]`).exists(), `${lang}/${key}`).toBe(true)
        expect(t(`cust_item_${key}` as never)).not.toBe('')
        expect(t(`cust_item_${key}_desc` as never)).not.toBe('')
      }
    }
    localStorage.setItem('site_lang', 'ru')
    expect(card('week_valley').text()).toContain('Долина')
    expect(card('week_slope').text()).toContain('Спуск')
    expect(card('week_peak').text()).toContain('Пик')
    expect(card('week_saw').text()).toContain('Пила')
    expect(card('week_towers').text()).toContain('Башни')
    expect(card('week_weekend').text()).toContain('Выходные')
  })
  it('превью разной формы: у «Долины» края выше середины, у «Спуска» столбики убывают', () => {
    const heights = (key: string) => card(key).findAll('[data-testid^="week-preview-"] rect[fill="var(--border)"]').map((e) => Number(e.attributes('height')))
    const v = heights('week_valley')
    expect(v).toHaveLength(7)
    expect(v[0]).toBeGreaterThan(v[3])
    expect(v[6]).toBeGreaterThan(v[3])
    const s = heights('week_slope')
    for (let i = 1; i < 7; i++) expect(s[i]).toBeLessThan(s[i - 1])
    const pk = heights('week_peak')
    expect(pk[3]).toBeGreaterThan(pk[0])
    expect(pk[3]).toBeGreaterThan(pk[6])
    expect(pk[0]).toBeCloseTo(pk[6], 5)
    const sw = heights('week_saw')
    expect(sw[2]).toBeGreaterThan(sw[0])
    expect(sw[3]).toBeLessThan(sw[2])
    expect(sw[5]).toBeCloseTo(sw[2], 5)
    const tw = heights('week_towers')
    expect(tw[1]).toBeGreaterThan(tw[0])
    expect(tw[4]).toBeCloseTo(tw[1], 5)
    expect(tw[2]).toBeCloseTo(tw[0], 5)
    const we = heights('week_weekend')
    expect(we[5]).toBeGreaterThan(we[4])
    expect(we[6]).toBeCloseTo(we[5], 5)
    expect(we[0]).toBeCloseTo(we[4], 5)
  })
})
