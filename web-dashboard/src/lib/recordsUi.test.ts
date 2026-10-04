import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import NumberMetricField from '../components/NumberMetricField.vue'
import SetsCard from '../components/SetsCard.vue'
import LayoutModal from '../components/LayoutModal.vue'
import ChartsConfigModal from '../components/ChartsConfigModal.vue'
import MetricsManagerModal from '../components/MetricsManagerModal.vue'
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

describe('раздельные выключатели рекордов (ответ владельца 2026-10-04)', () => {
  const chartsModal = () => mount(ChartsConfigModal, { props: { series: [], entries: [], period: { range: 'month', from: null, to: null } } as never })
  const metricsModal = () => mount(MetricsManagerModal, { props: { metrics: [], categories: [], error: null } })

  it('«Настроить графики»: галочка отмечена по умолчанию; снятие выключает рекорды ТОЛЬКО у графиков', async () => {
    const w = chartsModal()
    const box = w.find('[data-test="records-toggle-charts"]')
    expect((box.element as HTMLInputElement).checked).toBe(true)
    await box.setValue(false)
    expect(recordsEnabled('charts')).toBe(false)
    expect(recordsEnabled('metrics')).toBe(true)
    await box.setValue(true)
    expect(recordsEnabled('charts')).toBe(true)
  })

  it('«Управление метриками»: галочка отмечена по умолчанию; снятие выключает рекорды ТОЛЬКО у метрик', async () => {
    const w = metricsModal()
    const box = w.find('[data-test="records-toggle-metrics"]')
    expect((box.element as HTMLInputElement).checked).toBe(true)
    await box.setValue(false)
    expect(recordsEnabled('metrics')).toBe(false)
    expect(recordsEnabled('charts')).toBe(true)
    await box.setValue(true)
    expect(recordsEnabled('metrics')).toBe(true)
  })

  it('выбор запоминается: окна открываются с уже выбранным состоянием', () => {
    localStorage.setItem('site_records_charts', 'off')
    localStorage.setItem('site_records_metrics', 'off')
    expect((chartsModal().find('[data-test="records-toggle-charts"]').element as HTMLInputElement).checked).toBe(false)
    expect((metricsModal().find('[data-test="records-toggle-metrics"]').element as HTMLInputElement).checked).toBe(false)
  })

  it('прежний общий выбор «выключено» отражается в обоих окнах', () => {
    localStorage.setItem('site_records', 'off')
    expect((chartsModal().find('[data-test="records-toggle-charts"]').element as HTMLInputElement).checked).toBe(false)
    expect((metricsModal().find('[data-test="records-toggle-metrics"]').element as HTMLInputElement).checked).toBe(false)
  })

  it('в «Настроить Дашборд» общей галочки рекордов больше нет', () => {
    const w = mount(LayoutModal, { props: { initial: [] } })
    expect(w.find('[data-test="records-toggle"]').exists()).toBe(false)
  })

  it('выключатель метрик скрывает рекорд у числовой метрики и у подходов, графики не затрагивает', async () => {
    localStorage.setItem('site_records_metrics', 'off')
    const num = mount(NumberMetricField, { props: { metric: water, value: 1500, record: { y: 3200, date: '2026-05-01' } } })
    const sets = mount(SetsCard, { props: { metric: pushups, sets: [], record: { y: 120, date: '2026-05-01' } } })
    expect(num.find('[data-test="record-badge"]').exists()).toBe(false)
    expect(sets.find('[data-test="record-badge"]').exists()).toBe(false)
  })
})
