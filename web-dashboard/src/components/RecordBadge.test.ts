import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import RecordBadge from './RecordBadge.vue'
import { setRecordsEnabled } from '../lib/records'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
})

describe('RecordBadge', () => {
  it('показывает «Рекорд: значение с единицей · дата»', () => {
    const w = mount(RecordBadge, { props: { record: { y: 5200, date: '2026-09-12' }, unit: ' мл', kind: 'metrics' } })
    const text = w.find('[data-test="record-text"]').text().replace(/\s/g, ' ')
    expect(text).toContain('Рекорд: 5 200 мл')
    expect(text).toMatch(/12 сент\.? 2026/)
  })

  it('рекорда нет — ничего не рисуется', () => {
    expect(mount(RecordBadge, { props: { record: null, kind: 'metrics' } }).find('[data-test="record-badge"]').exists()).toBe(false)
    expect(mount(RecordBadge, { props: { record: undefined, kind: 'metrics' } }).find('[data-test="record-badge"]').exists()).toBe(false)
  })

  it('выключатель: по умолчанию показан; выключили — исчезает сразу, включили — появляется снова', async () => {
    const w = mount(RecordBadge, { props: { record: { y: 3, date: '2026-01-01' }, kind: 'metrics' } })
    expect(w.find('[data-test="record-badge"]').exists()).toBe(true)
    setRecordsEnabled(false, 'metrics')
    await w.vm.$nextTick()
    expect(w.find('[data-test="record-badge"]').exists()).toBe(false)
    setRecordsEnabled(true, 'metrics')
    await w.vm.$nextTick()
    expect(w.find('[data-test="record-badge"]').exists()).toBe(true)
    w.unmount()
  })

  it('прежний общий выбор (localStorage site_records = off) скрывает рекорды с самого начала', () => {
    localStorage.setItem('site_records', 'off')
    for (const kind of ['charts', 'metrics'] as const)
      expect(mount(RecordBadge, { props: { record: { y: 3, date: '2026-01-01' }, kind } }).find('[data-test="record-badge"]').exists()).toBe(false)
  })

  // BACKLOG раздел 28, ответ владельца 2026-10-04: выключатели раздельные — у графиков и у метрик
  it('выключили рекорды у графиков — у метрик они остаются, и наоборот', async () => {
    const rec = { y: 3, date: '2026-01-01' }
    const charts = mount(RecordBadge, { props: { record: rec, kind: 'charts' } })
    const metrics = mount(RecordBadge, { props: { record: rec, kind: 'metrics' } })
    setRecordsEnabled(false, 'charts')
    await charts.vm.$nextTick()
    expect(charts.find('[data-test="record-badge"]').exists()).toBe(false)
    expect(metrics.find('[data-test="record-badge"]').exists()).toBe(true)
    setRecordsEnabled(true, 'charts')
    setRecordsEnabled(false, 'metrics')
    await charts.vm.$nextTick()
    expect(charts.find('[data-test="record-badge"]').exists()).toBe(true)
    expect(metrics.find('[data-test="record-badge"]').exists()).toBe(false)
    charts.unmount()
    metrics.unmount()
  })
})
