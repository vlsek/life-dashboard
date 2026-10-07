import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// BACKLOG 19 «13:06», 30, «8:29 — третий раз» + миграция 054: подходы вводятся один раз — в «Тренировках», значение связанной метрики дня
// пересчитывается и пишется в daily_values; без миграции раздел работает как раньше.
type Row = Record<string, unknown>
interface Call { table: string; op: string; arg?: unknown; filters: Record<string, unknown> }
const h = vi.hoisted(() => ({
  exercises: [] as Row[],
  entries: [] as Row[],
  metrics: [] as Row[],
  metricsError: null as unknown,
  dailyToday: null as unknown,
  created: null as Row | null,
  calls: [] as { table: string; op: string; arg?: unknown; filters: Record<string, unknown> }[],
}))

vi.mock('./lib/supabase', () => ({
  sb: {
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'u1', email: 'a@b.c' } } } }) },
    from: (table: string) => {
      const writer = (op: string, arg?: unknown) => {
        const call: Call = { table, op, arg, filters: {} }
        h.calls.push(call)
        const p = Promise.resolve({ error: null }) as Promise<{ error: null }> & { eq: (c: string, v: unknown) => unknown }
        p.eq = (c: string, v: unknown) => ((call.filters[c] = v), p)
        // «база» принимает правку записи тренировки
        if (op === 'update' && table === 'workout_entries') {
          const patch = arg as Row
          p.eq = (c: string, v: unknown) => ((call.filters[c] = v), (h.entries = h.entries.map((e) => (e[c] === v ? { ...e, ...patch } : e))), p)
        }
        return p
      }
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: () => chain,
        order: () => chain,
        limit: () => chain,
        maybeSingle: () => Promise.resolve({ data: table === 'profiles' ? { onboarded: true, workout_program: null } : table === 'daily_values' ? h.dailyToday : null, error: null }),
        single: () => Promise.resolve({ data: h.created, error: null }),
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
          Promise.resolve(
            table === 'workout_exercises' ? { data: h.exercises, error: null } : table === 'workout_entries' ? { data: h.entries, error: null } : table === 'metrics' ? { data: h.metricsError ? null : h.metrics, error: h.metricsError } : { data: [], error: null },
          ).then(res, rej),
        insert: (row: unknown) => {
          h.calls.push({ table, op: 'insert', arg: row, filters: {} })
          return chain
        },
        upsert: (row: unknown, opts: unknown) => writer('upsert', { row, opts }),
        update: (patch: unknown) => writer('update', patch),
        delete: () => writer('delete'),
      }
      return chain
    },
  },
}))

import App from './App.vue'
import { todayStr } from './lib/date'

const exercise = (o: Row = {}) => ({ id: 'e1', user_id: 'u1', name: 'Подтягивания', category: 'upper', tracks_weight: false, unit: '', value_label: null, suggested_scheme: null, tracks_duration: false, bilateral: false, muscle_groups: null, created_at: '2026-01-01', ...o })
const set = (reps: number, time = '10:00') => ({ reps, weight: null, time, duration: null, side: null })
const entry = (o: Row = {}) => ({ id: 'n1', user_id: 'u1', exercise_id: 'e1', date: todayStr(), sets: [set(8)], notes: null, ...o })
const metric = (o: Row = {}) => ({ id: 'm1', name: 'Подтягивания', icon: '💪', type: 'sets', goal_value: null, source_exercise_id: 'e1', position: 1, ...o })

async function mountApp() {
  const w = mount(App, { attachTo: document.body })
  await flushPromises()
  await flushPromises()
  return w
}
const upserts = () => h.calls.filter((c) => c.table === 'daily_values' && c.op === 'upsert').map((c) => (c.arg as { row: { metric_id: string; date: string; value: unknown } }).row)

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  h.exercises = [exercise()]
  h.entries = [entry()]
  h.metrics = [metric()]
  h.metricsError = null
  h.dailyToday = null
  h.created = null
  h.calls = []
})

describe('зеркало подходов в метрику дня', () => {
  it('«+ подход» в тренировке пишет значение связанной метрики за сегодня (подходы записи, по времени)', async () => {
    const w = await mountApp()
    await w.find('[data-testid="quick-add-set"]').trigger('click')
    await flushPromises()
    await flushPromises()
    const ups = upserts()
    expect(ups).toHaveLength(1)
    expect(ups[0]).toMatchObject({ metric_id: 'm1', date: todayStr() })
    expect((ups[0].value as { reps: number }[]).map((s) => s.reps)).toEqual([8, 8])
    w.unmount()
  })

  it('метрика типа «Число» получает сумму повторов', async () => {
    h.metrics = [metric({ type: 'number' })]
    const w = await mountApp()
    await w.find('[data-testid="quick-add-set"]').trigger('click')
    await flushPromises()
    await flushPromises()
    expect(upserts()[0].value).toBe(16)
    w.unmount()
  })

  it('упражнение без связанной метрики и метрика другого упражнения не пишутся', async () => {
    h.metrics = [metric({ id: 'mX', source_exercise_id: 'другое' }), metric({ id: 'mY', source_exercise_id: null })]
    const w = await mountApp()
    await w.find('[data-testid="quick-add-set"]').trigger('click')
    await flushPromises()
    await flushPromises()
    expect(upserts()).toHaveLength(0)
    w.unmount()
  })

  it('без миграции 054 (метрики не читаются) — раздел как раньше: ни записи в метрику, ни кнопки связи', async () => {
    h.metricsError = { code: '42703', message: 'column metrics.source_exercise_id does not exist' }
    const w = await mountApp()
    expect(w.find('[data-testid="exercise-link-metric"]').exists()).toBe(false)
    expect(w.find('[data-testid="exercise-metric-chip"]').exists()).toBe(false)
    await w.find('[data-testid="quick-add-set"]').trigger('click')
    await flushPromises()
    await flushPromises()
    expect(upserts()).toHaveLength(0)
    w.unmount()
  })
})

describe('карточка упражнения и окно связи', () => {
  it('связанное упражнение: строка «В метриках дня · сегодня: N [из цели]» и кнопка связи', async () => {
    h.metrics = [metric({ goal_value: 50 })]
    const w = await mountApp()
    expect(w.find('[data-testid="exercise-link-metric"]').exists()).toBe(true)
    expect(w.find('[data-testid="exercise-metric-chip"]').text()).toContain('сегодня: 8 из 50')
    w.unmount()
  })

  it('несвязанное: кнопка есть, строки нет; окно предлагает подходящие метрики (подходы/число), булевы не показывает', async () => {
    h.metrics = [metric({ id: 'a', source_exercise_id: null, name: 'Отжимания' }), metric({ id: 'b', source_exercise_id: null, type: 'boolean', name: 'Зарядка' }), metric({ id: 'c', source_exercise_id: null, type: 'number', name: 'Шаги' })]
    const w = await mountApp()
    expect(w.find('[data-testid="exercise-metric-chip"]').exists()).toBe(false)
    await w.find('[data-testid="exercise-link-metric"]').trigger('click')
    const names = w.findAll('[data-test="ml-candidate"]').map((n) => n.text())
    expect(names).toHaveLength(2)
    expect(names.join(' ')).toContain('Отжимания')
    expect(names.join(' ')).toContain('Шаги')
    expect(names.join(' ')).not.toContain('Зарядка')
    w.unmount()
  })

  it('привязка заведённой метрики: пишет source_exercise_id, сегодняшние подходы метрики переносятся в тренировку (если записей за сегодня нет)', async () => {
    h.entries = []
    h.metrics = [metric({ id: 'a', source_exercise_id: null })]
    h.dailyToday = { value: [{ reps: 12, variation: null, time: '08:00' }] }
    const w = await mountApp()
    await w.find('[data-testid="exercise-link-metric"]').trigger('click')
    await w.find('[data-test="ml-link"]').trigger('click')
    await flushPromises()
    await flushPromises()
    expect(h.calls.find((c) => c.table === 'metrics' && c.op === 'update')?.arg).toEqual({ source_exercise_id: 'e1' })
    const ins = h.calls.find((c) => c.table === 'workout_entries' && c.op === 'insert')!.arg as { sets: { reps: number }[]; date: string }
    expect(ins.date).toBe(todayStr())
    expect(ins.sets.map((s) => s.reps)).toEqual([12])
    expect(w.text()).toContain('сегодняшние подходы перенесены')
    w.unmount()
  })

  it('«Создать метрику» вставляет метрику «Подходы» под упражнение; «Отвязать» обнуляет ссылку', async () => {
    h.metrics = [metric({ id: 'z', source_exercise_id: null, name: 'Другая' })]
    h.created = metric({ id: 'new' })
    let w = await mountApp()
    await w.find('[data-testid="exercise-link-metric"]').trigger('click')
    await w.find('[data-test="ml-create"]').trigger('click')
    await flushPromises()
    await flushPromises()
    const ins = h.calls.find((c) => c.table === 'metrics' && c.op === 'insert')!.arg as Row
    expect(ins).toMatchObject({ name: 'Подтягивания', type: 'sets', source_exercise_id: 'e1', active: true })
    w.unmount()

    h.calls = []
    h.metrics = [metric()]
    w = await mountApp()
    await w.find('[data-testid="exercise-link-metric"]').trigger('click')
    await w.find('[data-test="ml-unlink"]').trigger('click')
    await flushPromises()
    expect(h.calls.find((c) => c.table === 'metrics' && c.op === 'update')?.arg).toEqual({ source_exercise_id: null })
    w.unmount()
  })
})
