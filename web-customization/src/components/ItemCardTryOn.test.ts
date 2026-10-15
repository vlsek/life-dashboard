import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ItemCard from './ItemCard.vue'
import { itemByKey, type ItemStatus } from '../lib/customization'

// 47.6 срез 5b: кнопка «Примерить» на карточке видна ТОЛЬКО в режиме отладки и только у закрытых/платных предметов.
const item = itemByKey('day_glow')!
const card = (over: { status: ItemStatus; debug?: boolean; tried?: boolean }) =>
  mount(ItemCard, { props: { item, balance: 0, busy: false, disabled: false, ...over } })

describe('ItemCard: «Примерить»', () => {
  it('без режима отладки кнопки нет', () => {
    for (const status of ['locked', 'short', 'buyable', 'owned', 'selected'] as ItemStatus[]) {
      expect(card({ status }).find('[data-testid="tryon"]').exists()).toBe(false)
    }
  })

  it('в режиме отладки кнопка есть у locked/short/buyable и нет у owned/selected', () => {
    for (const status of ['locked', 'short', 'buyable'] as ItemStatus[]) {
      expect(card({ status, debug: true }).find('[data-testid="tryon"]').exists(), status).toBe(true)
    }
    for (const status of ['owned', 'selected'] as ItemStatus[]) {
      expect(card({ status, debug: true }).find('[data-testid="tryon"]').exists(), status).toBe(false)
    }
  })

  it('клик отправляет tryon; примеренный предмет: «Снять примерку» + пометка, клик отправляет untryon', async () => {
    const w = card({ status: 'locked', debug: true })
    await w.get('[data-testid="tryon"]').trigger('click')
    expect(w.emitted('tryon')).toHaveLength(1)
    const t = card({ status: 'locked', debug: true, tried: true })
    expect(t.find('[data-testid="tryon"]').exists()).toBe(false)
    expect(t.find('[data-testid="tryon-note"]').exists()).toBe(true)
    await t.get('[data-testid="untryon"]').trigger('click')
    expect(t.emitted('untryon')).toHaveLength(1)
  })
})
