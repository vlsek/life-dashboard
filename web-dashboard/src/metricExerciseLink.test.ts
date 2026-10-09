import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

// BACKLOG 19 «13:06 — это упражнение?», срез 2 (миграция 054): при создании метрики «Подходы»/«Число» можно связать её с упражнением «Тренировок»
// (существующим или новым) — подходы тогда вводятся один раз, в «Тренировках».
type Row = Record<string, unknown>
const h = vi.hoisted(() => ({ inserts: [] as { table: string; row: Row }[], exerciseError: null as unknown, metricError: null as unknown, exercises: [] as Row[] }))
vi.mock('./lib/supabase', () => ({
  sb: {
    from: (table: string) => {
      let inserted: Row | null = null
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: () => chain,
        order: () => chain,
        single: () => Promise.resolve(table === 'workout_exercises' ? { data: h.exerciseError ? null : { id: 'ex-new' }, error: h.exerciseError } : { data: inserted, error: null }),
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
          Promise.resolve(table === 'workout_exercises' ? { data: h.exercises, error: null } : table === 'metrics' && inserted ? { error: h.metricError } : { data: [], error: null }).then(res, rej),
        insert: (row: Row) => ((inserted = row), h.inserts.push({ table, row }), chain),
      }
      return chain
    },
  },
}))
vi.mock('./lib/confirmDialog', () => ({ confirmDialog: vi.fn(async () => true) }))

import MetricFormModal from './components/MetricFormModal.vue'
import { buildInsertRow, canLinkExercise, emptyForm, exerciseLinkAvailable, formFromMetric } from './lib/metricsManager'
import { useMetricsManager } from './lib/useMetricsManager'
import type { Metric } from './lib/types'

const form = (o: Record<string, unknown> = {}) => ({ ...emptyForm(), name: 'Подтягивания', type: 'sets' as const, ...o })
const exercises = [{ id: 'ex1', name: 'Отжимания' }, { id: 'ex2', name: 'Планка' }]

beforeEach(() => {
  localStorage.setItem('site_lang', 'ru')
  h.inserts = []
  h.exerciseError = null
  h.metricError = null
  h.exercises = []
})

describe('логика формы', () => {
  it('связать можно «Подходы» и «Число», но не «просто значение», галочку и выбор', () => {
    expect(canLinkExercise({ type: 'sets', trackOnly: false })).toBe(true)
    expect(canLinkExercise({ type: 'number', trackOnly: false })).toBe(true)
    expect(canLinkExercise({ type: 'number', trackOnly: true })).toBe(false)
    expect(canLinkExercise({ type: 'boolean', trackOnly: false })).toBe(false)
    expect(canLinkExercise({ type: 'multiselect', trackOnly: false })).toBe(false)
  })
  it('колонка source_exercise_id «есть», если видна у какой-то метрики или метрик ещё нет (тогда подскажет сохранение)', () => {
    expect(exerciseLinkAvailable([])).toBe(true)
    expect(exerciseLinkAvailable([{ id: 'a', source_exercise_id: null }])).toBe(true)
    expect(exerciseLinkAvailable([{ id: 'a' }, { id: 'b' }])).toBe(false)
  })
  it('строка вставки: ключ связи только когда она есть (без миграции обычная метрика сохраняется как раньше)', () => {
    expect('source_exercise_id' in buildInsertRow(form(), 'u', 1, null)).toBe(false)
    expect(buildInsertRow(form(), 'u', 1, null, 'ex1')).toMatchObject({ source_exercise_id: 'ex1', type: 'sets' })
  })
  it('форма из метрики и пустая форма знают о связи', () => {
    expect(emptyForm().exerciseLink).toBe('')
    expect(formFromMetric({ id: 'm', name: 'x', type: 'sets', source_exercise_id: 'ex9' } as Metric).exerciseLink).toBe('ex9')
    expect(formFromMetric({ id: 'm', name: 'x', type: 'sets' } as Metric).exerciseLink).toBe('')
  })
})

describe('сохранение: addMetric', () => {
  const run = async (f: ReturnType<typeof form>) => {
    const api = useMetricsManager()
    await api.load('u1')
    const ok = await api.addMetric(f)
    return { api, ok }
  }
  it('существующее упражнение: метрика получает source_exercise_id, упражнение не создаётся', async () => {
    const { ok } = await run(form({ exerciseLink: 'ex1' }))
    expect(ok).toBe(true)
    expect(h.inserts.filter((i) => i.table === 'workout_exercises')).toHaveLength(0)
    expect(h.inserts.find((i) => i.table === 'metrics')!.row).toMatchObject({ source_exercise_id: 'ex1', name: 'Подтягивания' })
  })
  it('«новое упражнение»: сначала создаётся упражнение с названием метрики, потом метрика ссылается на него', async () => {
    const { ok } = await run(form({ name: '  Подтягивания  ', exerciseLink: '__new__' }))
    expect(ok).toBe(true)
    expect(h.inserts.map((i) => i.table)).toEqual(['workout_exercises', 'metrics'])
    expect(h.inserts[0].row).toMatchObject({ user_id: 'u1', name: 'Подтягивания', tracks_weight: false })
    expect(h.inserts[1].row).toMatchObject({ source_exercise_id: 'ex-new' })
  })
  it('ошибка создания упражнения: метрика не создаётся, текст ошибки без сырых подробностей', async () => {
    h.exerciseError = { message: 'TypeError: Failed to fetch (https://abcd1234.supabase.co/rest/v1/workout_exercises)' }
    const { ok, api } = await run(form({ exerciseLink: '__new__' }))
    expect(ok).toBe(false)
    expect(h.inserts.some((i) => i.table === 'metrics')).toBe(false)
    expect(api.error.value).toBeTruthy()
    expect(api.error.value).not.toMatch(/supabase|https?:|workout_exercises/i)
  })
  it('без выбора связи или для «Галочки»/«просто значения» — ничего про упражнения', async () => {
    await run(form())
    expect('source_exercise_id' in h.inserts.find((i) => i.table === 'metrics')!.row).toBe(false)
    h.inserts = []
    await run(form({ type: 'boolean', exerciseLink: 'ex1' }))
    expect(h.inserts.filter((i) => i.table === 'workout_exercises')).toHaveLength(0)
    expect('source_exercise_id' in h.inserts.find((i) => i.table === 'metrics')!.row).toBe(false)
  })
  it('нет колонки (миграция 054 не применена): подсказка про миграцию', async () => {
    h.metricError = { message: "Could not find the 'source_exercise_id' column of 'metrics' in the schema cache" }
    const { ok, api } = await run(form({ exerciseLink: 'ex1' }))
    expect(ok).toBe(false)
    expect(api.error.value).toContain('054')
  })
  it('список упражнений подгружается вместе с метриками', async () => {
    h.exercises = exercises
    const api = useMetricsManager()
    await api.load('u1')
    expect(api.exercises.value.map((e) => e.name)).toEqual(['Отжимания', 'Планка'])
  })
})

describe('окно формы метрики', () => {
  const mountNew = (props: Record<string, unknown> = {}) => mount(MetricFormModal, { props: { existing: null, categories: [], exercises, exerciseLinkAvailable: true, ...props } as never })
  it('у новой метрики «Подходы»: выбор «не связывать / новое / упражнения», подсказка после выбора', async () => {
    const w = mountNew()
    await w.find('select').setValue('sets')
    const block = w.find('[data-test="exercise-link-block"]')
    expect(block.exists()).toBe(true)
    expect(w.find('[data-test="exercise-link-hint"]').exists()).toBe(false)
    await w.find('input[type="text"]').setValue('Подтягивания')
    const opts = w.findAll('[data-test="exercise-link"] option').map((o) => o.text())
    expect(opts[0]).toContain('Не связывать')
    expect(opts[1]).toContain('Новое упражнение «Подтягивания»')
    expect(opts.slice(2)).toEqual(['Отжимания', 'Планка'])
    await w.find('[data-test="exercise-link"]').setValue('ex2')
    expect(w.find('[data-test="exercise-link-hint"]').exists()).toBe(true)
    await w.find('button.primary, button[type="submit"], .modal-actions button:last-child').trigger('click')
    expect((w.emitted('save')?.[0]?.[0] as { exerciseLink: string } | undefined)?.exerciseLink).toBe('ex2')
  })
  it('для «Галочки», «Выбора», «просто значения» и когда миграции нет — блока нет; «новое» без названия не предлагается', async () => {
    const w = mountNew()
    await w.find('select').setValue('boolean')
    expect(w.find('[data-test="exercise-link-block"]').exists()).toBe(false)
    await w.find('select').setValue('number')
    expect(w.find('[data-test="exercise-link-block"]').exists()).toBe(true)
    expect(w.findAll('[data-test="exercise-link"] option').map((o) => o.text()).join(' ')).not.toContain('Новое упражнение')
    expect(mountNew({ exerciseLinkAvailable: false }).find('[data-test="exercise-link-block"]').exists()).toBe(false)
  })
  it('у уже связанной метрики — только пояснение с названием упражнения, выбора нет', () => {
    const w = mountNew({ existing: { id: 'm', name: 'Отжимания', type: 'sets', unit: null, goal_value: null, goal_direction: 'at_least', schedule: null, category_id: null, position: 1, source_exercise_id: 'ex1' } as Metric })
    expect(w.find('[data-test="exercise-link-block"]').exists()).toBe(false)
    expect(w.find('[data-test="exercise-linked-note"]').text()).toContain('«Отжимания»')
  })
})
