import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// «Огоньки стриков» в «Профиле» Дашборда (BACKLOG 46.3, миграция 057): баланс рядом с монетами, пересчёт после изменения данных, скрыт без миграции.
const h = vi.hoisted(() => ({ calls: 0, fail: false, balance: 7 as number | string }))
vi.mock('./lib/supabase', () => ({
  sb: {
    rpc: (fn: string) => {
      h.calls++
      return Promise.resolve(fn === 'sync_streak_sparks' && !h.fail ? { data: [{ earned: 9, spent: 2, balance: h.balance }], error: null } : { data: null, error: { message: 'function does not exist' } })
    },
  },
}))

import SparksBalance from './components/SparksBalance.vue'
import { SPARKS_RECONCILE_MS, parseSparksBalance } from './lib/useSparks'
import { notifyDataChanged } from './lib/events'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  h.calls = 0
  h.fail = false
  h.balance = 7
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('parseSparksBalance', () => {
  it('число и строка (bigint) принимаются; мусор — null', () => {
    expect(parseSparksBalance([{ balance: 7 }])).toBe(7)
    expect(parseSparksBalance([{ balance: '12' }])).toBe(12)
    expect(parseSparksBalance({ balance: 0 })).toBe(0)
    for (const bad of [null, undefined, [], [{}], [{ balance: 'x' }], 'x']) expect(parseSparksBalance(bad)).toBeNull()
  })
})

describe('SparksBalance в профиле', () => {
  it('показывает баланс огоньков со ссылкой в Магазин', async () => {
    const w = mount(SparksBalance, { attachTo: document.body })
    await flushPromises()
    const el = w.find('[data-test="sparks-balance"]')
    expect(el.exists()).toBe(true)
    expect(el.text()).toBe('7')
    expect(el.attributes('href')).toBe('/shop/')
    expect(el.attributes('title')).toContain('Огоньки стриков')
    w.unmount()
  })

  it('ноль огоньков тоже показывается (это баланс, а не отсутствие данных)', async () => {
    h.balance = 0
    const w = mount(SparksBalance, { attachTo: document.body })
    await flushPromises()
    expect(w.find('[data-test="sparks-balance"]').text()).toBe('0')
    w.unmount()
  })

  it('нет функции (миграция не применена) — блока нет', async () => {
    h.fail = true
    const w = mount(SparksBalance, { attachTo: document.body })
    await flushPromises()
    expect(w.find('[data-test="sparks-balance"]').exists()).toBe(false)
    w.unmount()
  })

  it('после изменения данных пересчёт через паузу, одним запросом на серию изменений', async () => {
    const w = mount(SparksBalance, { attachTo: document.body })
    await flushPromises()
    expect(h.calls).toBe(1)
    h.balance = 8
    notifyDataChanged({ source: 'sets' })
    notifyDataChanged({ source: 'sets' })
    notifyDataChanged({ source: 'water' })
    await vi.advanceTimersByTimeAsync(SPARKS_RECONCILE_MS - 10)
    expect(h.calls).toBe(1) // ещё ждём тишины
    await vi.advanceTimersByTimeAsync(20)
    await flushPromises()
    expect(h.calls).toBe(2)
    expect(w.find('[data-test="sparks-balance"]').text()).toBe('8')
    w.unmount()
  })

  it('после размонтирования события больше не слушаются', async () => {
    const w = mount(SparksBalance, { attachTo: document.body })
    await flushPromises()
    w.unmount()
    notifyDataChanged({ source: 'sets' })
    await vi.advanceTimersByTimeAsync(SPARKS_RECONCILE_MS + 50)
    expect(h.calls).toBe(1)
  })
})
