import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import WaterModal from './WaterModal.vue'
import { fmtDate } from '../lib/date'
import type { DayLogView } from '../lib/waterLog'
import type { Metric } from '../lib/types'

// «Крестик» у записей журнала воды за день (BACKLOG 23:17). Файл один в один лежит в web-dashboard и web-header (общий компонент воды).
const metric: Metric = { id: 'm1', user_id: 'u1', name: 'Water', icon: '💧', type: 'number', unit: 'мл', goal_value: null, goal_direction: null, schedule: null, category_id: null, position: 0 } as Metric
const base = { metric, currentMl: 750, normMl: 2000, autoNormMl: null, weightKg: null, getMlForDate: async () => 0 }
const at = (h: number, m: number) => new Date(2026, 9, 2, h, m).getTime()
const row = (id: string, h: number, m: number, delta: number) => ({ id, at: at(h, m), delta, kind: 'add' as const, total: null })
const rows = [row('c', 10, 0, 200), row('b', 9, 0, 300), row('a', 8, 0, 250)]
const view = (r: DayLogView['rows'] = rows): DayLogView => ({ rows: r, source: 'server' })
const TODAY = fmtDate(new Date())

describe('окно воды: крестики у записей журнала', () => {
  beforeEach(() => localStorage.setItem('site_lang', 'ru'))

  it('без removeEntry крестиков нет (старое поведение окна сохранено)', () => {
    const w = mount(WaterModal, { props: { ...base, dayLog: () => view() } })
    expect(w.findAll('[data-test="water-log-row"]')).toHaveLength(3)
    expect(w.find('[data-test="water-log-remove"]').exists()).toBe(false)
    w.unmount()
  })

  it('с removeEntry у каждой записи свой крестик с подписью для скринридера', () => {
    const w = mount(WaterModal, { props: { ...base, dayLog: () => view(), removeEntry: async () => 0 } })
    const crosses = w.findAll('[data-test="water-log-remove"]')
    expect(crosses).toHaveLength(3)
    for (const c of crosses) {
      expect(c.attributes('aria-label')).toBe('Удалить эту запись')
      expect(c.attributes('type')).toBe('button')
    }
    w.unmount()
  })

  it('клик по крестику удаляет именно ЭТУ запись (id и выбранная дата) и обновляет показанную сумму', async () => {
    const removeEntry = vi.fn(async () => 450)
    const w = mount(WaterModal, { props: { ...base, dayLog: () => view(), removeEntry } })
    await w.findAll('[data-test="water-log-remove"]')[1].trigger('click') // запись «b» (+300, 09:00)
    await flushPromises()
    expect(removeEntry).toHaveBeenCalledTimes(1)
    expect(removeEntry).toHaveBeenCalledWith(TODAY, 'b')
    expect(w.text()).toContain('450')
    w.unmount()
  })

  it('не записалось (null): сумма в окне прежняя, окно не ломается и крестики снова доступны', async () => {
    const removeEntry = vi.fn(async () => null)
    const w = mount(WaterModal, { props: { ...base, dayLog: () => view(), removeEntry } })
    await w.findAll('[data-test="water-log-remove"]')[0].trigger('click')
    await flushPromises()
    expect(w.text()).toContain('750')
    expect(w.find('[data-test="water-log-remove"]').attributes('disabled')).toBeUndefined()
    w.unmount()
  })

  it('пока идёт удаление, крестики заблокированы — двойной тап не удалит две записи', async () => {
    let finish: (v: number | null) => void = () => {}
    const removeEntry = vi.fn(() => new Promise<number | null>((res) => (finish = res)))
    const w = mount(WaterModal, { props: { ...base, dayLog: () => view(), removeEntry } })
    const crosses = w.findAll('[data-test="water-log-remove"]')
    await crosses[0].trigger('click')
    await crosses[1].trigger('click')
    expect(removeEntry).toHaveBeenCalledTimes(1)
    expect(crosses[2].attributes('disabled')).toBeDefined()
    finish(550)
    await flushPromises()
    expect(w.find('[data-test="water-log-remove"]').attributes('disabled')).toBeUndefined()
    w.unmount()
  })

  it('по-английски подпись крестика тоже есть', () => {
    localStorage.setItem('site_lang', 'en')
    const w = mount(WaterModal, { props: { ...base, dayLog: () => view(), removeEntry: async () => 0 } })
    expect(w.find('[data-test="water-log-remove"]').attributes('aria-label')).toBe('Remove this entry')
    w.unmount()
  })
})
