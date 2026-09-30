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
import { todayStr } from './date'

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
    expect(w.text()).toContain('boom')
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
})
