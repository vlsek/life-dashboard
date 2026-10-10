import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// BACKLOG 44.9: вкладки-категории фильтруют список; «Шаблоны» → клик → форма с заполненными полями.
const h = vi.hoisted(() => ({ rows: [] as Record<string, unknown>[] }))

vi.mock('./lib/supabase', () => ({
  sb: {
    auth: { getSession: async () => ({ data: { session: { user: { id: 'u1', email: 'a@b.c' } } } }) },
    from: (table: string) => {
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: () => chain,
        order: async () => ({ data: h.rows, error: null }),
        maybeSingle: async () => ({ data: table === 'profiles' ? { onboarded: true } : null }),
        insert: async () => ({ error: null }),
      }
      return chain
    },
  },
}))

import App from './App.vue'

const row = (id: string, name: string, category: string) => ({
  id, user_id: 'u1', name, category, last_date: null, interval_value: null, interval_unit: null, due_date: null, last_km: null, interval_km: null, note: null, history: [], done: false, created_at: '2026-10-01',
})

async function mountApp() {
  const w = mount(App, { attachTo: document.body })
  await flushPromises()
  await flushPromises()
  return w
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  document.body.innerHTML = ''
  h.rows = [row('1', 'Масло', 'Машина'), row('2', 'Шины', 'Машина'), row('3', 'Стоматолог', 'Здоровье')]
})

describe('Вехи: вкладки категорий и шаблоны', () => {
  it('вкладки со счётчиками; выбор фильтрует список и запоминается', async () => {
    const w = await mountApp()
    expect(w.get('[data-test="cat-tab-Машина"]').text()).toContain('Машина · 2')
    expect(w.text()).toContain('Стоматолог')
    await w.get('[data-test="cat-tab-Машина"]').trigger('click')
    expect(w.text()).toContain('Масло')
    expect(w.text()).not.toContain('Стоматолог')
    expect(localStorage.getItem('milestones_cat_filter')).toBe('Машина')
    w.unmount()
    const w2 = await mountApp()
    expect(w2.text()).not.toContain('Стоматолог')
    w2.unmount()
  })

  it('одна категория — вкладок нет', async () => {
    h.rows = [row('1', 'Масло', 'Машина')]
    const w = await mountApp()
    expect(w.find('[data-test="category-tabs"]').exists()).toBe(false)
    w.unmount()
  })

  it('«Шаблоны» → выбрать → форма открыта с названием, группой, интервалом и пометкой врача', async () => {
    h.rows = []
    const w = await mountApp()
    await w.get('[data-test="ms-templates-btn"]').trigger('click')
    expect(w.get('[data-test="tpl-health-note"]').text()).toContain('уточните у врача')
    await w.get('[data-test="tpl-cat-health"] [data-test="tpl-pick"]').trigger('click')
    expect(w.find('[data-test="templates-modal"]').exists()).toBe(false)
    const inputs = w.findAll('input').map((i) => (i.element as HTMLInputElement).value)
    expect(inputs).toContain('Общий осмотр у терапевта')
    expect(inputs).toContain('Здоровье')
    expect(inputs).toContain('12')
    w.unmount()
  })

  it('уже добавленная веха в каталоге помечена, а не предлагается снова', async () => {
    h.rows = [row('1', 'Страховка (ОСАГО/КАСКО)', 'Машина')]
    const w = await mountApp()
    await w.get('[data-test="ms-templates-btn"]').trigger('click')
    expect(w.findAll('[data-test="tpl-have"]')).toHaveLength(1)
    w.unmount()
  })
})
