import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { MIN_DAILY_COINS, MIN_DAILY_SPARKS, SCALES, dailyRate, niceRound, suggestPrice } from './lib/priceScale'
import ItemForm from './components/ItemForm.vue'
import { t } from './lib/i18n'

describe('масштаб покупки → цена (58.4)', () => {
  const now = new Date('2026-10-12T00:00:00Z')
  it('ставка: заработано / дней с регистрации (не меньше 14); нет данных — дежурная', () => {
    expect(dailyRate(3000, '2026-07-04T00:00:00Z', false, now)).toBeCloseTo(3000 / 100, 5)
  })
  it('молодой аккаунт делится на 14 дней, а не на 1', () => {
    expect(dailyRate(280, '2026-10-11T00:00:00Z', false, now)).toBeCloseTo(20, 5)
  })
  it('нет заработка или даты — дежурная ставка для баллов и огоньков', () => {
    expect(dailyRate(0, '2026-01-01T00:00:00Z', false, now)).toBe(MIN_DAILY_COINS)
    expect(dailyRate(null, null, true, now)).toBe(MIN_DAILY_SPARKS)
    expect(dailyRate(500, 'мусор', false, now)).toBe(MIN_DAILY_COINS)
  })
  it('цена растёт со ступенью, красивое округление', () => {
    const prices = SCALES.map((s) => suggestPrice(s.id, 30))
    expect(prices).toEqual([...prices].sort((a, b) => a - b))
    expect(new Set(prices).size).toBe(SCALES.length)
    expect(suggestPrice('tiny', 30)).toBe(15)
    expect(suggestPrice('huge', 30)).toBe(1350)
    expect(niceRound(0)).toBe(1)
    expect(niceRound(123)).toBe(120)
  })
  it('подписи ступеней есть в словаре', () => {
    for (const s of SCALES) {
      expect(t(('shop_scale_' + s.id) as never)).not.toBe('shop_scale_' + s.id)
      expect(t(('shop_scale_' + s.id + '_ex') as never)).not.toBe('shop_scale_' + s.id + '_ex')
    }
  })
  it('форма новой вещи: выбор ступени подставляет цену, поле остаётся редактируемым; у существующей вещи ступеней нет', async () => {
    const w = mount(ItemForm, { props: { existing: null, uploadImage: async () => null, dailyRate: 30 } })
    expect(w.findAll('[data-testid="scale-step"]')).toHaveLength(5)
    await w.find('[data-scale="notable"]').trigger('click')
    expect((w.find('[data-testid="cost-input"]').element as HTMLInputElement).value).toBe(String(suggestPrice('notable', 30)))
    await w.find('[data-testid="cost-input"]').setValue(777)
    expect((w.find('[data-testid="cost-input"]').element as HTMLInputElement).value).toBe('777')
    const ex = mount(ItemForm, { props: { existing: { id: '1', name: 'x', cost: 10 } as never, uploadImage: async () => null, dailyRate: 30 } })
    expect(ex.find('[data-testid="scale"]').exists()).toBe(false)
  })
})
