import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import DayModal from './components/DayModal.vue'
import type { PlannedItem } from './lib/types'

// BACKLOG 76.4 (срез 1): перенос пункта плана на другой день
const h = vi.hoisted(() => ({
  notes: {} as Record<string, unknown>, // date -> planned_goals из «базы»
  upserts: [] as { date: string; planned: unknown }[],
  failUpsertOn: null as string | null,
  readError: false,
}))
vi.mock('./lib/supabase', () => {
  const from = (_t: string) => {
    let date = ''
    const c: Record<string, unknown> = {}
    c.select = () => c
    c.eq = (k: string, v: string) => (k === 'date' && (date = v), c)
    c.maybeSingle = () => Promise.resolve(h.readError ? { data: null, error: { message: 'x' } } : { data: date in h.notes ? { planned_goals: h.notes[date] } : null, error: null })
    c.upsert = (row: { date: string; planned_goals: unknown }) => {
      if (h.failUpsertOn === row.date) return Promise.resolve({ error: { message: 'fail' } })
      h.upserts.push({ date: row.date, planned: row.planned_goals })
      h.notes[row.date] = row.planned_goals
      return Promise.resolve({ error: null })
    }
    return c
  }
  return { sb: { from, auth: { getSession: () => Promise.resolve({ data: { session: null } }) } } }
})
import { useCalendar } from './lib/useCalendar'

const mk = (text: string, done = false): PlannedItem => ({ type: 'custom', text, done })

beforeEach(() => {
  localStorage.setItem('site_lang', 'ru')
  h.notes = {}
  h.upserts = []
  h.failUpsertOn = null
  h.readError = false
})

describe('movePlanned', () => {
  it('добавляет пункт к плану целевого дня (из базы, старые строки тоже) и убирает из исходного; сначала цель', async () => {
    h.notes['2026-10-12'] = ['старая строка', { type: 'goal', text: 'Цель', done: true }]
    const c = useCalendar()
    await c.movePlanned('u1', '2026-10-10', '2026-10-12', [mk('Остаётся')], mk('Едет', true))
    expect(h.upserts.map((u) => u.date)).toEqual(['2026-10-12', '2026-10-10'])
    expect(h.upserts[0].planned).toEqual([mk('старая строка'), { type: 'goal', text: 'Цель', done: true }, mk('Едет')]) // перенесённый — невыполненный
    expect(h.upserts[1].planned).toEqual([mk('Остаётся')])
    expect(c.byDate.value['2026-10-12']).toHaveLength(3)
    expect(c.byDate.value['2026-10-10']).toEqual([mk('Остаётся')])
  })
  it('пустой целевой день: план из одного пункта', async () => {
    const c = useCalendar()
    await c.movePlanned('u1', '2026-10-10', '2026-11-03', [], mk('Едет'))
    expect(h.upserts[0]).toEqual({ date: '2026-11-03', planned: [mk('Едет')] })
  })
  it('ошибка чтения цели — ничего не записано; ошибка записи цели — исходный день не тронут', async () => {
    const c = useCalendar()
    h.readError = true
    await expect(c.movePlanned('u1', '2026-10-10', '2026-10-12', [], mk('Едет'))).rejects.toBeTruthy()
    expect(h.upserts).toHaveLength(0)
    h.readError = false
    h.failUpsertOn = '2026-10-12'
    await expect(c.movePlanned('u1', '2026-10-10', '2026-10-12', [], mk('Едет'))).rejects.toBeTruthy()
    expect(h.upserts).toHaveLength(0)
  })
  it('сбой записи исходного дня: пункт остаётся в обоих днях (дубль, а не потеря)', async () => {
    const c = useCalendar()
    h.failUpsertOn = '2026-10-10'
    await expect(c.movePlanned('u1', '2026-10-10', '2026-10-12', [], mk('Едет'))).rejects.toBeTruthy()
    expect(h.notes['2026-10-12']).toEqual([mk('Едет')])
  })
})

describe('DayModal: «Перенести»', () => {
  const modal = (initial: PlannedItem[], extra = {}) => mount(DayModal, { props: { dateStr: '2026-10-10', initial, ...extra } })
  it('кнопка есть у обычных пунктов и нет у целей', () => {
    const w = modal([mk('A'), { type: 'goal', text: 'G', done: false }])
    expect(w.findAll('[data-test="plan-move-btn"]')).toHaveLength(1)
    w.unmount()
  })
  it('«Завтра» и «+7 дней» отдают пункт и дату; в payload — все правки окна', async () => {
    const w = modal([mk('A'), mk('B')])
    await w.findAll('[data-test="plan-move-btn"]')[1].trigger('click')
    await w.find('[data-test="plan-move-tomorrow"]').trigger('click')
    expect(w.emitted('move')![0][0]).toEqual({ items: [mk('A'), mk('B')], index: 1, to: '2026-10-11' })
    await w.find('[data-test="plan-move-week"]').trigger('click')
    expect((w.emitted('move')![1][0] as { to: string }).to).toBe('2026-10-17')
    w.unmount()
  })
  it('своя дата: кнопка «Перенести» выключена на пустой и на той же дате, включается на другой', async () => {
    const w = modal([mk('A')])
    await w.find('[data-test="plan-move-btn"]').trigger('click')
    const go = w.find('[data-test="plan-move-go"]')
    expect(go.attributes('disabled')).toBeDefined()
    await w.find('[data-test="plan-move-date"]').setValue('2026-10-10')
    expect(go.attributes('disabled')).toBeDefined()
    await w.find('[data-test="plan-move-date"]').setValue('2026-12-01')
    expect(go.attributes('disabled')).toBeUndefined()
    await go.trigger('click')
    expect((w.emitted('move')![0][0] as { to: string }).to).toBe('2026-12-01')
    w.unmount()
  })
  it('повторное нажатие на «→» сворачивает строку; ошибка показывается', async () => {
    const w = modal([mk('A')], { moveError: 'Нет сети' })
    expect(w.find('[data-test="plan-move-error"]').text()).toBe('Нет сети')
    await w.find('[data-test="plan-move-btn"]').trigger('click')
    expect(w.find('[data-test="plan-move-row"]').exists()).toBe(true)
    await w.find('[data-test="plan-move-btn"]').trigger('click')
    expect(w.find('[data-test="plan-move-row"]').exists()).toBe(false)
    w.unmount()
  })
})
