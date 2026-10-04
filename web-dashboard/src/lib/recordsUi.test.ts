import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import NumberMetricField from '../components/NumberMetricField.vue'
import SetsCard from '../components/SetsCard.vue'
import LayoutModal from '../components/LayoutModal.vue'
import { recordsEnabled } from './records'
import type { Metric } from './types'

const water = { id: 'w', name: 'Вода', type: 'number', unit: 'мл', icon: null } as unknown as Metric
const pushups = { id: 's', name: 'Отжимания', type: 'sets', icon: null } as unknown as Metric

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
})

describe('рекорды в «Дневных метриках» (BACKLOG раздел 28)', () => {
  it('числовая метрика: под полем рекорд с единицей метрики; без рекорда — строки нет', () => {
    const w = mount(NumberMetricField, { props: { metric: water, value: 1500, record: { y: 3200, date: '2026-05-01' } } })
    expect(w.find('[data-test="record-text"]').text().replace(/\s/g, ' ')).toContain('Рекорд: 3 200 мл')
    expect(mount(NumberMetricField, { props: { metric: water, value: 1500 } }).find('[data-test="record-badge"]').exists()).toBe(false)
  })

  it('метрика-подходы: под сводкой рекорд — сумма повторений за день', () => {
    const w = mount(SetsCard, { props: { metric: pushups, sets: [], record: { y: 120, date: '2026-05-01' } } })
    const text = w.find('[data-test="record-text"]').text()
    expect(text).toContain('Рекорд: 120')
    expect(text).toContain('повторений всего')
    expect(mount(SetsCard, { props: { metric: pushups, sets: [] } }).find('[data-test="record-badge"]').exists()).toBe(false)
  })
})

describe('окно «Настроить Дашборд»: галочка «Показывать рекорды»', () => {
  it('по умолчанию отмечена; снятие выключает рекорды (localStorage), возврат — включает', async () => {
    const w = mount(LayoutModal, { props: { initial: [] } })
    const box = w.find('[data-test="records-toggle"]')
    expect((box.element as HTMLInputElement).checked).toBe(true)
    await box.setValue(false)
    expect(recordsEnabled()).toBe(false)
    expect(localStorage.getItem('site_records')).toBe('off')
    await box.setValue(true)
    expect(recordsEnabled()).toBe(true)
  })

  it('если рекорды уже выключены — галочка снята при открытии окна', () => {
    localStorage.setItem('site_records', 'off')
    const w = mount(LayoutModal, { props: { initial: [] } })
    expect((w.find('[data-test="records-toggle"]').element as HTMLInputElement).checked).toBe(false)
  })
})
