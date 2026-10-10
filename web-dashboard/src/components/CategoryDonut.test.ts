import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CategoryDonut from './CategoryDonut.vue'
import ProgressSummaryModal from './ProgressSummaryModal.vue'
import type { ProgressSummary, SummaryItem } from '../lib/progressSummary'

const m = (name: string, done: number, category?: string): SummaryItem => ({ kind: 'metric', name, weight: 1, doneWeight: done, category })
const summaryOf = (items: SummaryItem[]): ProgressSummary => {
  const total = items.length
  const done = items.reduce((s, i) => s + i.doneWeight, 0)
  return { items, bonus: [], done, total, basePct: Math.round((done / total) * 100), bonusPct: 0, totalPct: Math.round((done / total) * 100), itemPct: 100 / total }
}

describe('CategoryDonut (BACKLOG 656 а)', () => {
  it('две и более группы — рисует кольцо и легенду с процентами', () => {
    const w = mount(CategoryDonut, { props: { items: [m('a', 1, 'Спорт'), m('b', 0, 'Спорт'), m('c', 1, 'Учёба')] } })
    expect(w.find('[data-test="category-donut"]').exists()).toBe(true)
    expect(w.findAll('[data-test="donut-legend"]').map((l) => l.text())).toEqual(['Спорт1/2 · 50%', 'Учёба1/1 · 100%'])
    expect(w.findAll('[data-test="donut-track"]').length).toBe(2)
    expect(w.findAll('[data-test="donut-fill"]').length).toBe(2)
  })
  it('одна группа или пусто — ничего не рисует', () => {
    expect(mount(CategoryDonut, { props: { items: [m('a', 1, 'Спорт'), m('b', 1, 'Спорт')] } }).find('[data-test="category-donut"]').exists()).toBe(false)
    expect(mount(CategoryDonut, { props: { items: [] } }).find('[data-test="category-donut"]').exists()).toBe(false)
  })
  it('в окне сводки диаграмма есть у дня и нет у недели', () => {
    const s = summaryOf([m('a', 1, 'Спорт'), m('b', 0, 'Учёба')])
    expect(mount(ProgressSummaryModal, { props: { kind: 'day', summary: s } }).find('[data-test="category-donut"]').exists()).toBe(true)
    expect(mount(ProgressSummaryModal, { props: { kind: 'week', summary: s } }).find('[data-test="category-donut"]').exists()).toBe(false)
  })
})
