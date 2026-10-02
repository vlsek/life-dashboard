import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import WaterModal from './WaterModal.vue'
import type { Metric } from '../lib/types'

// Журнал «Записи за день» в окне воды (BACKLOG 2.2 «Время приема воды», срез без БД).
const metric: Metric = { id: 'm1', user_id: 'u1', name: 'Water', icon: '💧', type: 'number', unit: 'мл', goal_value: null, goal_direction: null, schedule: null, category_id: null, position: 0 }
const base = { metric, currentMl: 700, normMl: 2000, autoNormMl: null, weightKg: null, getMlForDate: async () => 0 }
const at = (h: number, m: number) => new Date(2026, 9, 2, h, m).getTime()

describe('WaterModal — журнал записей за день', () => {
  beforeEach(() => localStorage.setItem('site_lang', 'ru'))

  it('без dayLog блока нет (старое поведение окна сохранено)', () => {
    const w = mount(WaterModal, { props: base })
    expect(w.find('[data-test="water-log"]').exists()).toBe(false)
    w.unmount()
  })

  it('пустой журнал или только записи без времени — блока нет', () => {
    const w = mount(WaterModal, { props: { ...base, dayLog: () => [{ prev: 0, next: 200 }] } })
    expect(w.find('[data-test="water-log"]').exists()).toBe(false)
    w.unmount()
  })

  it('показывает время и изменение, от новых к старым; убывание — с настоящим минусом', () => {
    const entries = [
      { prev: 0, next: 250, at: at(8, 5) },
      { prev: 250, next: 700, at: at(12, 30) },
      { prev: 700, next: 600, at: at(13, 0) },
    ]
    const w = mount(WaterModal, { props: { ...base, dayLog: () => entries } })
    const rows = w.findAll('[data-test="water-log-row"]').map((r) => r.findAll('span').map((x) => x.text()))
    expect(rows).toEqual([
      ['13:00', '\u2212100 мл'],
      ['12:30', '+450 мл'],
      ['08:05', '+250 мл'],
    ])
    expect(w.find('[data-test="water-log"]').text()).toContain('на этом устройстве')
    w.unmount()
  })

  it('спрашивает журнал именно за выбранную дату (сегодня по умолчанию)', () => {
    const seen: string[] = []
    const w = mount(WaterModal, { props: { ...base, dayLog: (d: string) => (seen.push(d), []) } })
    expect(seen[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    w.unmount()
  })

  it('реагирует на новые записи (журнал обновляется, когда пришла новая запись)', async () => {
    const w = mount(WaterModal, { props: { ...base, dayLog: () => [{ prev: 0, next: 200, at: at(9, 0) }] } })
    expect(w.findAll('[data-test="water-log-row"]').length).toBe(1)
    await w.setProps({ dayLog: () => [{ prev: 0, next: 200, at: at(9, 0) }, { prev: 200, next: 400, at: at(10, 0) }] })
    expect(w.findAll('[data-test="water-log-row"]').length).toBe(2)
    w.unmount()
  })
})
