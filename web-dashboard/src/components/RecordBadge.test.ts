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
    const w = mount(RecordBadge, { props: { record: { y: 5200, date: '2026-09-12' }, unit: ' мл' } })
    const text = w.find('[data-test="record-text"]').text().replace(/\s/g, ' ')
    expect(text).toContain('Рекорд: 5 200 мл')
    expect(text).toMatch(/12 сент\.? 2026/)
  })

  it('рекорда нет — ничего не рисуется', () => {
    expect(mount(RecordBadge, { props: { record: null } }).find('[data-test="record-badge"]').exists()).toBe(false)
    expect(mount(RecordBadge, { props: { record: undefined } }).find('[data-test="record-badge"]').exists()).toBe(false)
  })

  it('выключатель: по умолчанию показан; выключили — исчезает сразу, включили — появляется снова', async () => {
    const w = mount(RecordBadge, { props: { record: { y: 3, date: '2026-01-01' } } })
    expect(w.find('[data-test="record-badge"]').exists()).toBe(true)
    setRecordsEnabled(false)
    await w.vm.$nextTick()
    expect(w.find('[data-test="record-badge"]').exists()).toBe(false)
    setRecordsEnabled(true)
    await w.vm.$nextTick()
    expect(w.find('[data-test="record-badge"]').exists()).toBe(true)
    w.unmount()
  })

  it('выключено заранее (localStorage) — не показывается с самого начала', () => {
    localStorage.setItem('site_records', 'off')
    expect(mount(RecordBadge, { props: { record: { y: 3, date: '2026-01-01' } } }).find('[data-test="record-badge"]').exists()).toBe(false)
  })
})
