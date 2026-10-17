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
  it('восемь предметов; новые «Долина» (150) и «Спуск» (100)', () => {
    expect(week.map((i) => i.key)).toEqual(['week_classic', 'week_bars', 'week_dots', 'week_steps', 'week_wave', 'week_teeth', 'week_valley', 'week_slope'])
    expect(week.map(priceOf).slice(-2)).toEqual([150, 100])
    expect(rarityOfItem('week_valley')).toBe('uncommon')
    expect(rarityOfItem('week_slope')).toBe('common')
  })
  it('вид из ключа: каждый предмет реестра соответствует виду недели', () => {
    expect(parseWeekGauge('week_valley')).toBe('valley')
    expect(parseWeekGauge('week_slope')).toBe('slope')
    for (const i of week) expect(parseWeekGauge(i.key), i.key).not.toBe('heptagon')
  })
  it('карточка рисует превью своего вида и показывает название и описание на двух языках', () => {
    for (const lang of ['ru', 'en']) {
      localStorage.setItem('site_lang', lang)
      for (const key of ['week_valley', 'week_slope']) {
        const w = card(key)
        expect(w.find(`[data-testid="week-preview-${key.replace('week_', '')}"]`).exists(), `${lang}/${key}`).toBe(true)
        expect(t(`cust_item_${key}` as never)).not.toBe('')
        expect(t(`cust_item_${key}_desc` as never)).not.toBe('')
      }
    }
    localStorage.setItem('site_lang', 'ru')
    expect(card('week_valley').text()).toContain('Долина')
    expect(card('week_slope').text()).toContain('Спуск')
  })
  it('превью разной формы: у «Долины» края выше середины, у «Спуска» столбики убывают', () => {
    const heights = (key: string) => card(key).findAll('[data-testid^="week-preview-"] rect[fill="var(--border)"]').map((e) => Number(e.attributes('height')))
    const v = heights('week_valley')
    expect(v).toHaveLength(7)
    expect(v[0]).toBeGreaterThan(v[3])
    expect(v[6]).toBeGreaterThan(v[3])
    const s = heights('week_slope')
    for (let i = 1; i < 7; i++) expect(s[i]).toBeLessThan(s[i - 1])
  })
})
