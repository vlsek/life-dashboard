import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { PARTS, formatDelta, normalizeRows, parseCm, sparkPoints, summarize, type Measurement } from './lib/measurements'
import MeasurementsSection from './components/MeasurementsSection.vue'
import { t, type DictKey } from './lib/i18n'

const row = (id: string, date: string, part: Measurement['part'], v: number): Measurement => ({ id, date, part, value_cm: v })

describe('замеры тела (57.1)', () => {
  it('parseCm: запятая, округление, границы', () => {
    expect(parseCm('34,55')).toBe(34.6)
    expect(parseCm(' 80 ')).toBe(80)
    for (const bad of ['', 'abc', '0', '0.9', '301', '-5']) expect(parseCm(bad), bad).toBeNull()
  })
  it('normalizeRows: numeric-строки, мусор отбрасывается, сортировка по дате', () => {
    const r = normalizeRows([
      { id: 'b', date: '2026-10-02', part: 'waist', value_cm: '81.5' },
      { id: 'a', date: '2026-10-01', part: 'waist', value_cm: '82' },
      { id: 'x', date: '2026-10-01', part: 'tail', value_cm: '5' },
      null,
    ])
    expect(r.map((x) => x.id)).toEqual(['a', 'b'])
    expect(r[1].value_cm).toBe(81.5)
    expect(normalizeRows(undefined)).toEqual([])
  })
  it('summarize: последнее, предыдущее и разница; порядок как в PARTS', () => {
    const s = summarize([row('1', '2026-10-01', 'waist', 82), row('2', '2026-10-08', 'waist', 81.2), row('3', '2026-10-03', 'chest', 100)])
    expect(s.map((x) => x.part)).toEqual(['chest', 'waist'])
    expect(s[0].delta).toBeNull()
    expect(s[1].delta).toBe(-0.8)
    expect(formatDelta(-0.8)).toBe('−0,8')
    expect(formatDelta(1.5)).toBe('+1,5')
    expect(formatDelta(0)).toBe('±0')
  })
  it('sparkPoints: одна точка по центру, равные значения — ровная линия', () => {
    expect(sparkPoints([row('1', 'd', 'waist', 80)])[0]).toEqual({ x: 60, y: 16 })
    const flat = sparkPoints([row('1', 'a', 'waist', 80), row('2', 'b', 'waist', 80)])
    expect(flat.every((p) => p.y === 16)).toBe(true)
    const up = sparkPoints([row('1', 'a', 'waist', 80), row('2', 'b', 'waist', 90)])
    expect(up[1].y).toBeLessThan(up[0].y)
  })
  it('названия всех частей есть в словаре', () => {
    for (const p of PARTS) expect(t(`meas_part_${p}` as DictKey)).not.toBe(`meas_part_${p}`)
  })

  it('компонент: свёрнут по умолчанию; сохранение шлёт часть, дату и число; плохое значение не шлёт', async () => {
    localStorage.clear()
    const w = mount(MeasurementsSection, { props: { rows: [], busy: false, error: null } })
    expect(w.find('[data-testid="measurements-body"]').exists()).toBe(false)
    await w.find('[data-testid="measurements-toggle"]').trigger('click')
    expect(w.find('[data-testid="meas-empty"]').exists()).toBe(true)
    await w.find('[data-testid="meas-value"]').setValue('abc')
    await w.find('[data-testid="measurements-form"]').trigger('submit')
    expect(w.emitted('add')).toBeUndefined()
    expect(w.find('[data-testid="meas-bad"]').exists()).toBe(true)
    await w.find('[data-testid="meas-part"]').setValue('chest')
    await w.find('[data-testid="meas-value"]').setValue('101,5')
    await w.find('[data-testid="measurements-form"]').trigger('submit')
    const ev = w.emitted('add')![0] as unknown[]
    expect(ev[0]).toBe('chest')
    expect(ev[2]).toBe(101.5)
  })
  it('компонент: список с разницей, история и удаление', async () => {
    localStorage.setItem('workouts_measurements_open', '1')
    const rows = [row('1', '2026-10-01', 'waist', 82), row('2', '2026-10-08', 'waist', 81)]
    const w = mount(MeasurementsSection, { props: { rows, busy: false, error: null } })
    expect(w.find('[data-testid="meas-delta"]').text()).toBe('−1')
    await w.find('[data-testid="meas-row"]').trigger('click')
    expect(w.findAll('[data-testid="meas-history-row"]')).toHaveLength(2)
    expect(w.find('[data-testid="meas-spark"]').exists()).toBe(true)
    await w.findAll('[data-testid="meas-delete"]')[0].trigger('click')
    expect(w.emitted('remove')![0]).toEqual(['2'])
  })
})
