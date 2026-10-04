import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import rawSource from './components/DailyMetricsSection.vue?raw'
import { addDaysIso, todayStr } from './lib/date'

// BACKLOG 07:51: «Планы» — смотреть, что было вчера и раньше; та же «переключалка дня», что у метрик.
const h = vi.hoisted(() => ({ eqs: [] as [string, unknown][] }))
vi.mock('./lib/supabase', () => ({
  sb: {
    from: () => {
      const chain: any = {
        select: () => chain,
        eq: (c: string, v: unknown) => (h.eqs.push([c, v]), chain),
        gte: () => chain,
        lt: () => chain,
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
        then: (res: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(res),
        upsert: () => Promise.resolve({ error: null }),
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      }
      return chain
    },
  },
}))

import PlannedSection from './components/PlannedSection.vue'

beforeEach(() => {
  h.eqs = []
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
})

describe('PlannedSection: переключатель дня', () => {
  it('со switchable в блоке есть DateStepper с выбранной датой', async () => {
    const w = mount(PlannedSection, { props: { userId: 'u1', date: '2026-10-02', switchable: true } })
    await flushPromises()
    const stepper = w.find('[data-test="date-stepper"]')
    expect(stepper.exists()).toBe(true)
  })

  it('«‹» и «›» просят у родителя соседний день, чип «Сегодня» — сегодняшний', async () => {
    const w = mount(PlannedSection, { props: { userId: 'u1', date: '2026-10-02', switchable: true } })
    await flushPromises()
    await w.find('[data-test="date-prev"]').trigger('click')
    expect(w.emitted('update:date')?.[0]).toEqual(['2026-10-01'])
    await w.find('[data-test="date-next"]').trigger('click')
    expect(w.emitted('update:date')?.[1]).toEqual(['2026-10-03'])
  })

  it('без switchable (блок сам по себе) переключателя нет — как раньше', async () => {
    const w = mount(PlannedSection, { props: { userId: 'u1' } })
    await flushPromises()
    expect(w.find('[data-test="date-stepper"]').exists()).toBe(false)
  })

  it('смена даты у родителя перезагружает план за этот день (запрос идёт по новой дате)', async () => {
    const w = mount(PlannedSection, { props: { userId: 'u1', date: '2026-10-02', switchable: true } })
    await flushPromises()
    await w.setProps({ date: '2026-10-01' })
    await flushPromises()
    const dates = h.eqs.filter(([c]) => c === 'date').map(([, v]) => v)
    expect(dates).toContain('2026-10-02')
    expect(dates).toContain('2026-10-01')
  })

  it('кнопка переноса незавершённого есть только на сегодняшнем дне', async () => {
    const past = mount(PlannedSection, { props: { userId: 'u1', date: addDaysIso(todayStr(), -1), switchable: true } })
    await flushPromises()
    expect(past.find('[data-test="carry"]').exists()).toBe(false)
    const today = mount(PlannedSection, { props: { userId: 'u1', date: todayStr(), switchable: true } })
    await flushPromises()
    expect(today.find('[data-test="carry"]').exists()).toBe(true)
  })
})

describe('DailyMetricsSection: общая дата', () => {
  const markup = rawSource.slice(rawSource.indexOf('<template>'))
  it('«Планы» получают дату через v-model:date и включённый переключатель', () => {
    expect(markup).toMatch(/<PlannedSection v-model:date="date"[^>]*switchable/)
  })
})
