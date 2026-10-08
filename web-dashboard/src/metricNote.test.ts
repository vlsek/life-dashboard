import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { askNoteFields, buildInsertRow, buildUpdateRow, emptyForm, formFromMetric } from './lib/metricsManager'
import BooleanMetricRow from './components/BooleanMetricRow.vue'
import type { Metric } from './lib/types'

// BACKLOG 867 «Учёба»: по умолчанию просто отмечать «учился» + необязательная заметка «что учил/изучил» (миграция 058).
const metric = (o: Partial<Metric> = {}): Metric => ({ id: 'm1', user_id: 'u', name: 'Учёба', icon: '📚', type: 'boolean', unit: null, goal_value: null, goal_direction: null, schedule: null, category_id: null, position: 0, ...o }) as Metric

describe('форма метрики: askNote', () => {
  it('по умолчанию выключено; читается из метрики', () => {
    expect(emptyForm().askNote).toBe(false)
    expect(formFromMetric(metric({ ask_note: true })).askNote).toBe(true)
    expect(formFromMetric(metric({ ask_note: false })).askNote).toBe(false)
    expect(formFromMetric(metric()).askNote).toBe(false)
  })
  it('пишем ask_note только если включено у «галочки» или колонка у метрики уже есть (работает и до миграции 058)', () => {
    const on = { ...emptyForm(), type: 'boolean' as const, askNote: true }
    expect(askNoteFields(on, null)).toEqual({ ask_note: true })
    expect(askNoteFields({ ...on, askNote: false }, null)).toEqual({}) // новая метрика без заметки — колонку не трогаем
    expect(askNoteFields({ ...on, askNote: false }, metric({ ask_note: true }))).toEqual({ ask_note: false }) // сняли галочку — пишем false
    expect(askNoteFields({ ...on, type: 'number' }, metric({ ask_note: true }))).toEqual({ ask_note: false }) // сменили тип — заметка не нужна
    expect(askNoteFields({ ...on, type: 'number' }, null)).toEqual({}) // не «галочка» — не пишем
  })
  it('payload новой и правленой метрики содержит ask_note по тем же правилам', () => {
    const f = { ...emptyForm(), name: 'Учёба', type: 'boolean' as const, askNote: true }
    expect(buildInsertRow(f, 'u1', 0, null)).toMatchObject({ ask_note: true })
    expect(buildInsertRow({ ...f, askNote: false }, 'u1', 0, null)).not.toHaveProperty('ask_note')
    expect(buildUpdateRow(f, metric({ ask_note: false }), null)).toMatchObject({ ask_note: true })
  })
})

describe('BooleanMetricRow: поле заметки', () => {
  beforeEach(() => localStorage.setItem('site_lang', 'ru'))
  it('поле только у отмеченной метрики с ask_note; без ask_note или без отметки — нет', () => {
    expect(mount(BooleanMetricRow, { props: { metric: metric({ ask_note: true }), checked: true } }).find('[data-test="metric-note"]').exists()).toBe(true)
    expect(mount(BooleanMetricRow, { props: { metric: metric({ ask_note: true }), checked: false } }).find('[data-test="metric-note"]').exists()).toBe(false)
    expect(mount(BooleanMetricRow, { props: { metric: metric({ ask_note: false }), checked: true } }).find('[data-test="metric-note"]').exists()).toBe(false)
    expect(mount(BooleanMetricRow, { props: { metric: metric(), checked: true } }).find('[data-test="metric-note"]').exists()).toBe(false)
  })
  it('показывает сохранённую заметку, подсказку-плейсхолдер и отдаёт текст по change', async () => {
    const w = mount(BooleanMetricRow, { props: { metric: metric({ ask_note: true }), checked: true, note: 'Vue 3' } })
    const input = w.find('[data-test="metric-note"]')
    expect((input.element as HTMLInputElement).value).toBe('Vue 3')
    expect(input.attributes('placeholder')).toBe('Что делал(а)? (необязательно)')
    expect(input.attributes('maxlength')).toBe('500')
    await input.setValue('Vue 3 и Pinia')
    await input.trigger('change')
    expect(w.emitted('note')?.at(-1)).toEqual(['Vue 3 и Pinia'])
  })
  it('галочка по-прежнему переключается', async () => {
    const w = mount(BooleanMetricRow, { props: { metric: metric(), checked: false } })
    await w.find('input[type="checkbox"]').setValue(true)
    expect(w.emitted('toggle')).toEqual([[true]])
  })
})

const h = vi.hoisted(() => ({ calls: [] as any[], metricsData: [] as any[], valuesData: [] as any[], noteReadError: null as any, upsertError: null as any }))
vi.mock('./lib/supabase', () => ({
  sb: {
    from: (table: string) => {
      const chain: any = {
        select: (cols: string) => ((chain.cols = cols), chain),
        eq: () => chain,
        order: () => chain,
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
        then: (res: (v: unknown) => unknown) => {
          // ошибка только на запрос заметок (колонка note), чтение значений остаётся рабочим — как до миграции 058
          if (table === 'daily_values' && h.noteReadError && /note/.test(String(chain.cols))) return Promise.resolve({ data: null, error: h.noteReadError }).then(res)
          return Promise.resolve({ data: table === 'metrics' ? h.metricsData : h.valuesData, error: null }).then(res)
        },
        upsert: (payload: unknown) => (h.calls.push({ op: 'upsert', table, payload }), Promise.resolve({ error: h.upsertError })),
      }
      return chain
    },
  },
}))
const { useDailyMetrics } = await import('./lib/useDailyMetrics')
function setup() {
  let api!: ReturnType<typeof useDailyMetrics>
  const wrapper = mount(defineComponent({ setup: () => ((api = useDailyMetrics()), () => null) }))
  return { api, wrapper }
}

describe('useDailyMetrics: заметки', () => {
  beforeEach(() => {
    h.calls = []
    h.noteReadError = null
    h.upsertError = null
    h.metricsData = [metric({ ask_note: true })]
    h.valuesData = [{ metric_id: 'm1', value: true, note: 'Vue 3' }]
  })
  it('читает заметки за день; отметка при этом читается как раньше', async () => {
    const { api, wrapper } = setup()
    await api.load('u1', '2026-10-08')
    expect(api.notes.value).toEqual({ m1: 'Vue 3' })
    expect(api.pending.value.m1).toBe(true)
    wrapper.unmount()
  })
  it('нет колонки note (миграция не применена): сбой чтения заметок не ломает загрузку дня', async () => {
    h.noteReadError = { message: 'column daily_values.note does not exist' }
    const { api, wrapper } = setup()
    await api.load('u1', '2026-10-08')
    expect(api.notes.value).toEqual({})
    expect(api.error.value).toBeNull()
    expect(api.loaded.value).toBe(true)
    wrapper.unmount()
  })
  it('setNote пишет заметку вместе с текущей отметкой; пробелы обрезаются, длина ≤ 500; пустая стирает (null)', async () => {
    const { api, wrapper } = setup()
    await api.load('u1', '2026-10-08')
    h.calls = []
    expect(await api.setNote(metric({ ask_note: true }), '  Vue 3 и Pinia  ')).toBe(true)
    expect(h.calls[0]).toMatchObject({ op: 'upsert', table: 'daily_values', payload: { metric_id: 'm1', date: '2026-10-08', value: true, note: 'Vue 3 и Pinia' } })
    expect(api.notes.value.m1).toBe('Vue 3 и Pinia')
    await api.setNote(metric({ ask_note: true }), 'x'.repeat(600))
    expect((h.calls[1].payload as any).note).toHaveLength(500)
    await api.setNote(metric({ ask_note: true }), '   ')
    expect((h.calls[2].payload as any).note).toBeNull()
    expect(api.notes.value.m1).toBeUndefined()
    wrapper.unmount()
  })
  it('тот же текст повторно не пишется; ошибка записи — понятный текст и заметка не «сохраняется» молча', async () => {
    const { api, wrapper } = setup()
    await api.load('u1', '2026-10-08')
    h.calls = []
    expect(await api.setNote(metric({ ask_note: true }), 'Vue 3')).toBe(true)
    expect(h.calls).toHaveLength(0)
    h.upsertError = { message: 'column "note" of relation "daily_values" does not exist' }
    expect(await api.setNote(metric({ ask_note: true }), 'Другое')).toBe(false)
    expect(api.error.value).not.toContain('daily_values')
    expect(api.notes.value.m1).toBe('Vue 3')
    wrapper.unmount()
  })
})
