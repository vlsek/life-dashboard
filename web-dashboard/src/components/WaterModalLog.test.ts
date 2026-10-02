import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import WaterModal from './WaterModal.vue'
import { fmtDate } from '../lib/date'
import { timeToMs, type DayLogView } from '../lib/waterLog'
import type { Metric } from '../lib/types'

// Журнал «Записи за день» и поле «Время» в окне воды (BACKLOG 2.2 «Время приема воды»).
const metric: Metric = { id: 'm1', user_id: 'u1', name: 'Water', icon: '💧', type: 'number', unit: 'мл', goal_value: null, goal_direction: null, schedule: null, category_id: null, position: 0 }
const base = { metric, currentMl: 700, normMl: 2000, autoNormMl: null, weightKg: null, getMlForDate: async () => 0 }
const at = (h: number, m: number) => new Date(2026, 9, 2, h, m).getTime()
const row = (id: string, h: number, m: number, delta: number) => ({ id, at: at(h, m), delta, kind: 'add' as const, total: null })
const view = (rows: DayLogView['rows'], source: DayLogView['source'] = 'local'): DayLogView => ({ rows, source })
const TODAY = fmtDate(new Date())

describe('WaterModal — журнал записей за день', () => {
  beforeEach(() => localStorage.setItem('site_lang', 'ru'))

  it('без dayLog блока нет (старое поведение окна сохранено)', () => {
    const w = mount(WaterModal, { props: base })
    expect(w.find('[data-test="water-log"]').exists()).toBe(false)
    w.unmount()
  })

  it('пустой журнал — блока нет', () => {
    const w = mount(WaterModal, { props: { ...base, dayLog: () => view([]) } })
    expect(w.find('[data-test="water-log"]').exists()).toBe(false)
    w.unmount()
  })

  it('показывает время и изменение в том порядке, как отдал журнал; убывание — с настоящим минусом', () => {
    const rows = [row('c', 13, 0, -100), row('b', 12, 30, 450), row('a', 8, 5, 250)]
    const w = mount(WaterModal, { props: { ...base, dayLog: () => view(rows) } })
    const out = w.findAll('[data-test="water-log-row"]').map((r) => r.findAll('span').map((x) => x.text()))
    expect(out).toEqual([
      ['13:00', '\u2212100 мл'],
      ['12:30', '+450 мл'],
      ['08:05', '+250 мл'],
    ])
    w.unmount()
  })

  it('подпись зависит от источника: аккаунт (все устройства) или только это устройство', () => {
    const w = mount(WaterModal, { props: { ...base, dayLog: () => view([row('a', 8, 5, 250)], 'server') } })
    expect(w.find('[data-test="water-log"]').text()).toContain('на всех устройствах')
    w.unmount()
    const w2 = mount(WaterModal, { props: { ...base, dayLog: () => view([row('a', 8, 5, 250)], 'local') } })
    expect(w2.find('[data-test="water-log"]').text()).toContain('на этом устройстве')
    w2.unmount()
  })

  it('спрашивает журнал за выбранную дату и обновляется, когда пришла новая запись', async () => {
    const seen: string[] = []
    const w = mount(WaterModal, { props: { ...base, dayLog: (d: string) => (seen.push(d), view([row('a', 9, 0, 200)])) } })
    expect(seen[0]).toBe(TODAY)
    expect(w.findAll('[data-test="water-log-row"]').length).toBe(1)
    await w.setProps({ dayLog: () => view([row('a', 9, 0, 200), row('b', 10, 0, 200)]) })
    expect(w.findAll('[data-test="water-log-row"]').length).toBe(2)
    w.unmount()
  })
})

describe('WaterModal — загрузка журнала и время', () => {
  beforeEach(() => localStorage.setItem('site_lang', 'ru'))

  it('при открытии и при смене даты просит загрузить журнал именно этого дня', async () => {
    const loadDayLog = vi.fn(async () => {})
    const w = mount(WaterModal, { props: { ...base, loadDayLog } })
    expect(loadDayLog).toHaveBeenCalledWith(TODAY)
    const input = w.find('input[type="date"]')
    ;(input.element as HTMLInputElement).value = '2026-09-01'
    await input.trigger('change')
    expect(loadDayLog).toHaveBeenLastCalledWith('2026-09-01')
    w.unmount()
  })

  it('время не трогали — «+200» уходит без времени (сегодня — «сейчас» решит композабл)', async () => {
    const w = mount(WaterModal, { props: base })
    await w.find('[data-test="add-200"]').trigger('click')
    expect(w.emitted('add')![0]).toEqual([200, TODAY, undefined])
    w.unmount()
  })

  it('указали время — оно уходит третьим аргументом; сегодня — не позже «сейчас»', async () => {
    const w = mount(WaterModal, { props: base })
    await w.find('[data-test="water-time"]').setValue('00:00')
    await w.find('[data-test="add-200"]').trigger('click')
    expect(w.emitted('add')![0]).toEqual([200, TODAY, timeToMs(TODAY, '00:00')])
    await w.find('[data-test="water-time"]').setValue('23:59')
    await w.find('[data-test="add-200"]').trigger('click')
    const sent = w.emitted('add')![1][2] as number
    expect(sent).toBeLessThanOrEqual(Date.now()) // из будущего нельзя
    w.unmount()
  })

  it('прошлый день: время сбрасывается при смене даты; указанное время относится к выбранному дню', async () => {
    const w = mount(WaterModal, { props: base })
    await w.find('[data-test="water-time"]').setValue('08:15')
    const input = w.find('input[type="date"]')
    ;(input.element as HTMLInputElement).value = '2026-09-01'
    await input.trigger('change')
    expect((w.find('[data-test="water-time"]').element as HTMLInputElement).value).toBe('') // сброшено
    await w.find('[data-test="add-200"]').trigger('click')
    expect(w.emitted('add')![0]).toEqual([200, '2026-09-01', undefined]) // прошлый день без выбора — решит композабл (12:00)
    await w.find('[data-test="water-time"]').setValue('21:40')
    await w.find('[data-test="add-200"]').trigger('click')
    expect(w.emitted('add')![1]).toEqual([200, '2026-09-01', timeToMs('2026-09-01', '21:40')])
    w.unmount()
  })
})
