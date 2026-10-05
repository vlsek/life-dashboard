import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const h = vi.hoisted(() => ({ fail: false, rows: {} as Record<string, any[]> }))
vi.mock('./supabase', () => ({
  sb: {
    from: (table: string) => {
      const chain: any = {
        select: () => chain, eq: () => chain, gte: () => chain, lte: () => chain, order: () => chain,
        then: (res: (v: unknown) => unknown) =>
          Promise.resolve(h.fail ? { data: null, error: { message: 'boom' } } : { data: h.rows[table] ?? [], error: null }).then(res),
      }
      return chain
    },
  },
}))

import PointsLogModal from '../components/PointsLogModal.vue'
import { addDaysIso, todayStr } from './date'

describe('PointsLogModal', () => {
  it('lists what was earned today, totals, and links to the shop only from the modal', async () => {
    h.fail = false
    h.rows = {
      metrics: [{ id: 'a', name: 'Push-ups', icon: null, type: 'number', goal_value: 10, goal_direction: 'at_least' }],
      daily_values: [{ date: todayStr(), metric_id: 'a', value: 15 }],
      goals: [{ name: 'Marathon', points: 20, done_date: todayStr() }],
      books: [],
      shop_items: [],
    }
    const w = mount(PointsLogModal, { props: { userId: 'u1', balance: 123 } })
    await flushPromises()
    expect(w.text()).toContain('123')
    expect(w.text()).toContain('Push-ups')
    expect(w.text()).toContain('Marathon')
    expect(w.find('[data-test="points-totals"]').text()).toContain('+21')
    const link = w.find('[data-test="points-shop-link"]')
    expect(link.attributes('href')).toBe('/shop/')
    w.unmount()
  })
  it('shows the error instead of a list when loading fails', async () => {
    h.fail = true
    const w = mount(PointsLogModal, { props: { userId: 'u1', balance: 5 } })
    await flushPromises()
    expect(w.text()).toMatch(/Could not load|Не получилось загрузить/) // понятный текст
    expect(w.text()).not.toContain('boom')
    expect(w.find('[data-test="points-totals"]').exists()).toBe(false)
    w.unmount()
  })
  it('closes on the close button and on backdrop click', async () => {
    h.fail = false
    h.rows = {}
    const w = mount(PointsLogModal, { props: { userId: 'u1', balance: 0 } })
    await flushPromises()
    await w.find('button.secondary').trigger('click')
    await w.find('.modal-backdrop').trigger('click')
    expect(w.emitted('close')).toHaveLength(2)
    w.unmount()
  })

  // BACKLOG 16 (17:02): по умолчанию последние 5 источников прибытка, остальное разворачивается вниз
  describe('compact list', () => {
    const manyGoals = (n: number) =>
      Array.from({ length: n }, (_, i) => ({ name: 'Goal ' + (i + 1), points: 5, done_date: addDaysIso(todayStr(), -(i % 3)) }))
    const setup = async (goals: any[], shop: any[] = []) => {
      h.fail = false
      h.rows = { metrics: [], daily_values: [], goals, books: [], shop_items: shop }
      const w = mount(PointsLogModal, { props: { userId: 'u1', balance: 10 } })
      await flushPromises()
      return w
    }
    it('shows only the 5 latest earnings by default and a "show more" button with the rest count', async () => {
      const w = await setup(manyGoals(8))
      expect(w.findAll('[data-test="points-row"]')).toHaveLength(5)
      const btn = w.find('[data-test="points-toggle"]')
      expect(btn.exists()).toBe(true)
      expect(btn.text()).toContain('(3)')
      expect(btn.attributes('aria-expanded')).toBe('false')
      w.unmount()
    })
    it('lists the newest day first', async () => {
      const w = await setup([
        { name: 'Old', points: 5, done_date: addDaysIso(todayStr(), -2) },
        { name: 'New', points: 5, done_date: todayStr() },
      ])
      const rows = w.findAll('[data-test="points-row"]').map((r) => r.text())
      expect(rows[0]).toContain('New')
      expect(rows[1]).toContain('Old')
      w.unmount()
    })
    it('expands the remaining earnings on click and collapses back', async () => {
      const w = await setup(manyGoals(8))
      await w.find('[data-test="points-toggle"]').trigger('click')
      expect(w.find('[data-test="points-toggle"]').attributes('aria-expanded')).toBe('true')
      // все 8 записей — в DOM (3 из них в сворачиваемой части)
      expect(w.findAll('[data-test="points-row"], [data-test="points-row-more"]')).toHaveLength(8)
      await w.find('[data-test="points-toggle"]').trigger('click')
      expect(w.find('[data-test="points-toggle"]').attributes('aria-expanded')).toBe('false')
      w.unmount()
    })
    it('has no toggle when there are up to 5 earnings and no purchases', async () => {
      const w = await setup(manyGoals(5))
      expect(w.findAll('[data-test="points-row"]')).toHaveLength(5)
      expect(w.find('[data-test="points-toggle"]').exists()).toBe(false)
      w.unmount()
    })
    it('purchases are not "earnings": they live in their own list behind the toggle', async () => {
      const w = await setup(manyGoals(2), [{ name: 'Headphones', cost: 100, redeemed_date: todayStr() }])
      const visible = w.findAll('[data-test="points-row"]').map((r) => r.text()).join(' ')
      expect(visible).not.toContain('Headphones')
      expect(w.find('[data-test="points-purchases"]').text()).toContain('Headphones')
      expect(w.find('[data-test="points-purchases"]').text()).toContain('−100')
      expect(w.find('[data-test="points-toggle"]').exists()).toBe(true) // есть что развернуть
      w.unmount()
    })
    it('shows an empty message when nothing was earned', async () => {
      const w = await setup([])
      expect(w.find('[data-test="points-empty"]').exists()).toBe(true)
      expect(w.findAll('[data-test="points-row"]')).toHaveLength(0)
      w.unmount()
    })
  })
})
