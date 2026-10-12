import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ItemCard from './components/ItemCard.vue'
import { CATEGORY_ORDER, ITEMS, parseSelected, priceOf } from './lib/customization'
import { rarityOfItem } from './lib/rarity'
import { WATER_ITEMS, parseWaterItem } from './lib/waterAnim'

// Платные анимации воды как предметы «Кастомизации» (BACKLOG 54.9): цены по ступеням, редкость, превью, соответствие вида ключу предмета.
const water = ITEMS.filter((i) => i.category === 'water_anim')

describe('предметы «Анимация воды»', () => {
  it('пять предметов за баллы по ступеням 100/150/250/150/250 (59.4: «Качка» и «Сияние»); категория есть в порядке разделов', () => {
    expect(water.map((i) => i.key)).toEqual(['water_rain', 'water_tide', 'water_sparkle', 'water_sway', 'water_glow'])
    expect(water.map(priceOf)).toEqual([100, 150, 250, 150, 250])
    expect(CATEGORY_ORDER).toContain('water_anim')
  })
  it('редкость растёт с ценой', () => {
    expect(water.map((i) => rarityOfItem(i.key))).toEqual(['common', 'uncommon', 'rare', 'uncommon', 'rare'])
  })
  it('вид из ключа предмета: каждый предмет реестра соответствует виду анимации', () => {
    for (const i of water) expect(parseWaterItem(i.key), i.key).toBe(WATER_ITEMS[i.key])
    expect(Object.keys(WATER_ITEMS).sort()).toEqual(water.map((i) => i.key).sort())
  })
  it('выбор предмета категории читается из profiles.customization', () => {
    expect(parseSelected({ water_anim: 'water_tide' }).water_anim).toBe('water_tide')
    expect(parseSelected({ water_anim: 'day_glow' }).water_anim).toBeUndefined()
  })
  it('карточка показывает живой пример анимации и описание', async () => {
    localStorage.setItem('site_lang', 'ru')
    for (const i of water) {
      const w = mount(ItemCard, { props: { item: i, status: 'locked', balance: 500, busy: false, disabled: false } })
      expect(w.find('[data-testid="water-anim-preview"]').exists(), i.key).toBe(true)
      expect(w.find('[data-testid="item-desc"]').text().length, i.key).toBeGreaterThan(10)
      await new Promise((r) => setTimeout(r, 20))
      expect(w.find('.water-saved-inline').attributes('data-variant')).toBe(WATER_ITEMS[i.key]) // живой пример (57.2)
      w.unmount()
    }
  })
})

describe('у платных анимаций воды нет кнопки «Показать» — пример идёт сам (BACKLOG 58.1)', () => {
  for (const key of ['water_rain', 'water_tide', 'water_sparkle', 'water_sway', 'water_glow']) {
    it(`${key}: живой пример есть, кнопки нет`, async () => {
      const item = ITEMS.find((i) => i.key === key)!
      const w = mount(ItemCard, { props: { item, status: 'locked', balance: 0, busy: false, disabled: false }, attachTo: document.body })
      await new Promise((r) => setTimeout(r, 30))
      expect(w.find('.water-saved-inline').exists()).toBe(true)
      expect(w.find('[data-testid="water-demo"]').exists()).toBe(false)
    })
  }
})
