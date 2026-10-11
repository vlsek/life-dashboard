import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// BACKLOG 58.7 (вариант А): блок «Планы» проще — в основной строке только поле и «Добавить», три способа добавить — ссылками ниже,
// редкие настройки (время, «уже сделано», бонус ☆, уведомления) — в свёрнутом «Дополнительно». Все прежние элементы остаются в DOM.
const h = vi.hoisted(() => ({ writes: [] as unknown[] }))
vi.mock('./lib/supabase', () => ({
  sb: {
    from: () => {
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        gte: () => chain,
        lt: () => chain,
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
        then: (res: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(res),
        upsert: (p: unknown) => (h.writes.push(p), Promise.resolve({ error: null })),
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      }
      return chain
    },
  },
}))

import PlannedSection from './components/PlannedSection.vue'

beforeEach(() => {
  h.writes = []
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
})

const mountPlanned = async (date = '2026-10-02') => {
  const w = mount(PlannedSection, { props: { userId: 'u1', date }, attachTo: document.body })
  await flushPromises()
  return w
}

describe('«Планы»: упрощённая раскладка (58.7)', () => {
  it('основная строка — поле и «Добавить»; три способа — отдельным рядом ссылок', async () => {
    const w = await mountPlanned()
    const row = w.find('[data-test="add-row"]')
    expect(row.find('[data-test="custom-input"]').exists()).toBe(true)
    expect(row.find('[data-test="add-custom"]').exists()).toBe(true)
    expect(row.find('[data-test="new-time"]').exists()).toBe(false)
    expect(row.find('[data-test="new-done"]').exists()).toBe(false)
    const links = w.find('[data-test="add-links"]')
    expect(links.find('[data-test="add-goal"]').exists()).toBe(true)
    expect(links.find('[data-test="new-goal"]').exists()).toBe(true)
    w.unmount()
  })
  it('«С прошлых дней» только на сегодняшнем дне', async () => {
    const past = await mountPlanned('2020-01-01')
    expect(past.find('[data-test="carry"]').exists()).toBe(false)
    past.unmount()
    const today = new Date()
    const d = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const w = await mountPlanned(d)
    expect(w.find('[data-test="add-links"] [data-test="carry"]').exists()).toBe(true)
    w.unmount()
  })
  it('время, «уже сделано» и подсказка про бонус — внутри свёрнутого «Дополнительно»', async () => {
    const w = await mountPlanned()
    const more = w.find('details[data-test="plan-more"]')
    expect(more.exists()).toBe(true)
    expect(more.attributes('open')).toBeUndefined()
    expect(more.find('[data-test="new-time"]').exists()).toBe(true)
    expect(more.find('[data-test="new-done"]').exists()).toBe(true)
    expect(more.text()).toContain('☆')
    w.unmount()
  })
})
