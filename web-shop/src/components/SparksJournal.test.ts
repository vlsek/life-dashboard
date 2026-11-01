import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import SparksJournal from './SparksJournal.vue'

const source = { rows: [{ day: '2026-10-29', metric_id: 'm1', amount: 1 }, { day: '2026-10-29', metric_id: 'm2', amount: 1 }], names: { m1: 'Вода', m2: 'Сон' }, cap: 10 }
const mk = (load: () => Promise<typeof source>, extra = {}) => mount(SparksJournal, { props: { load, purchases: [], balance: 7, today: '2026-10-30', ...extra } })

describe('SparksJournal (78.5)', () => {
  it('свёрнут и ничего не грузит, пока не раскроют; при раскрытии грузит один раз', async () => {
    const load = vi.fn(async () => source)
    const w = mk(load)
    expect(load).not.toHaveBeenCalled()
    expect(w.find('[data-testid="journal-body"]').exists()).toBe(false)
    await w.find('[data-testid="journal-toggle"]').trigger('click')
    await flushPromises()
    expect(load).toHaveBeenCalledTimes(1)
    await w.find('[data-testid="journal-toggle"]').trigger('click') // свернули
    await w.find('[data-testid="journal-toggle"]').trigger('click') // раскрыли снова
    await flushPromises()
    expect(load).toHaveBeenCalledTimes(1)
  })
  it('показывает итоги, остаток, день с метриками и пояснение потолка', async () => {
    const w = mk(async () => source)
    await w.find('[data-testid="journal-toggle"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="journal-summary"]').text()).toContain('+2')
    expect(w.find('[data-testid="journal-summary"]').text()).toContain('7')
    expect(w.find('[data-testid="journal-day"]').text()).toContain('29.10')
    expect(w.find('[data-testid="journal-day"]').text()).toContain('Вода, Сон')
    expect(w.find('[data-testid="journal-note"]').text()).toContain('10')
  })
  it('пусто — подсказка; ошибка — «повторить», повтор подгружает', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce({ rows: [], names: {}, cap: 10 })
    const w = mk(load)
    await w.find('[data-testid="journal-toggle"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="journal-error"]').exists()).toBe(true)
    await w.find('[data-testid="journal-retry"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="journal-error"]').exists()).toBe(false)
    expect(w.find('[data-testid="journal-empty"]').exists()).toBe(true)
  })
  it('трата показана в своём дне', async () => {
    const w = mk(async () => source, { purchases: [{ name: 'Кофе', cost: 5, date: '2026-10-29' }] })
    await w.find('[data-testid="journal-toggle"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="journal-day-spent"]').text()).toContain('5')
    expect(w.find('[data-testid="journal-day"]').text()).toContain('Кофе')
  })
})
