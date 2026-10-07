import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { WorkoutEntry, WorkoutSet } from './types'

// Связь «метрика дня ↔ упражнение» (BACKLOG 19/30, «8:29 — третий раз», миграция 054).
const h = vi.hoisted(() => ({ calls: [] as { table: string; op: string; arg?: unknown; filters: Record<string, unknown> }[], single: null as unknown, selectData: null as unknown, err: null as unknown }))
vi.mock('./supabase', () => ({
  sb: {
    from: (table: string) => {
      const filters: Record<string, unknown> = {}
      const chain: Record<string, unknown> = {}
      const done = (op: string, arg?: unknown) => {
        h.calls.push({ table, op, arg, filters: { ...filters } })
        return Promise.resolve({ error: h.err })
      }
      Object.assign(chain, {
        select: () => chain,
        eq: (c: string, v: unknown) => ((filters[c] = v), chain),
        order: () => chain,
        maybeSingle: () => Promise.resolve({ data: h.selectData, error: null }),
        single: () => Promise.resolve({ data: h.single, error: null }),
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve({ data: h.selectData, error: h.err }).then(res, rej),
        insert: (row: unknown) => (h.calls.push({ table, op: 'insert', arg: row, filters: {} }), Object.assign(done('noop'), chain)),
        upsert: (row: unknown, opts: unknown) => done('upsert', { row, opts }),
        update: (patch: unknown) => ({ eq: (c: string, v: unknown) => ((filters[c] = v), { eq: (c2: string, v2: unknown) => ((filters[c2] = v2), done('update', patch)) }) }),
        delete: () => ({ eq: (c: string, v: unknown) => ((filters[c] = v), { eq: (c2: string, v2: unknown) => ((filters[c2] = v2), { eq: (c3: string, v3: unknown) => ((filters[c3] = v3), done('delete')) }) }) }),
      })
      return chain
    },
  },
}))

import { createLinkedMetric, isMissingColumn, linkMetric, metricValueFor, setsFromMetricValue, setsOfDay, syncLinkedMetrics, totalReps, unlinkMetric, type LinkedMetric } from './metricLink'

const S = (reps: number | null, time: string | null = null): WorkoutSet => ({ reps, weight: null, time, duration: null, side: null })
const E = (id: string, ex: string, date: string, sets: WorkoutSet[]): WorkoutEntry => ({ id, user_id: 'u', exercise_id: ex, date, sets, notes: null })
const M = (id: string, type = 'sets', src: string | null = 'ex1'): LinkedMetric => ({ id, name: 'Отжимания', icon: '💪', type, goal_value: null, source_exercise_id: src })

beforeEach(() => {
  h.calls.length = 0
  h.single = null
  h.selectData = null
  h.err = null
})

describe('setsOfDay / metricValueFor', () => {
  const entries = [E('a', 'ex1', '2026-10-06', [S(10, '09:00'), S(8)]), E('b', 'ex1', '2026-10-06', [S(12, '07:30')]), E('c', 'ex2', '2026-10-06', [S(99)]), E('d', 'ex1', '2026-10-05', [S(5)])]
  it('подходы за дату из ВСЕХ записей упражнения, по времени; без времени — в конце; чужие упражнения и даты не берём', () => {
    expect(setsOfDay(entries, 'ex1', '2026-10-06').map((s) => s.reps)).toEqual([12, 10, 8])
    expect(setsOfDay(entries, 'ex1', '2026-10-04')).toEqual([])
  })
  it('для «Подходы» — список {reps, variation: null, time}; для «Число» — сумма повторов; нет подходов — null', () => {
    const sets = setsOfDay(entries, 'ex1', '2026-10-06')
    expect(metricValueFor('sets', sets)).toEqual([{ reps: 12, variation: null, time: '07:30' }, { reps: 10, variation: null, time: '09:00' }, { reps: 8, variation: null, time: null }])
    expect(metricValueFor('number', sets)).toBe(30)
    expect(metricValueFor('sets', [])).toBeNull()
    expect(totalReps(sets)).toBe(30)
  })
})

describe('setsFromMetricValue (импорт сегодняшнего значения)', () => {
  it('список подходов → подходы тренировки без веса; нулевые и пустые отбрасываются', () => {
    expect(setsFromMetricValue([{ reps: 10, variation: 'узкие', time: '08:00' }, { reps: 0, variation: null, time: null }, { reps: null }])).toEqual([S(10, '08:00')])
  })
  it('число → один подход; мусор → пусто', () => {
    expect(setsFromMetricValue(25)).toEqual([S(25)])
    expect(setsFromMetricValue('15')).toEqual([S(15)])
    expect(setsFromMetricValue(null)).toEqual([])
    expect(setsFromMetricValue(0)).toEqual([])
  })
})

describe('isMissingColumn', () => {
  it('код 42703 / PGRST204 или текст про колонку — миграция не применена', () => {
    expect(isMissingColumn({ code: '42703' })).toBe(true)
    expect(isMissingColumn({ code: 'PGRST204', message: 'x' })).toBe(true)
    expect(isMissingColumn({ message: 'column metrics.source_exercise_id does not exist' })).toBe(true)
    expect(isMissingColumn({ code: '23505', message: 'dup' })).toBe(false)
    expect(isMissingColumn(null)).toBe(false)
  })
})

describe('syncLinkedMetrics', () => {
  it('upsert значения за каждую дату; пустой день — удаление; чужие метрики не трогаем', async () => {
    const entries = [E('a', 'ex1', '2026-10-06', [S(10, '09:00')])]
    const linked = [M('m1', 'sets'), M('m2', 'number'), M('mX', 'sets', 'ex2'), M('mY', 'sets', null)]
    const fails = await syncLinkedMetrics('u', 'ex1', linked, entries, ['2026-10-06', '2026-10-06', '2026-10-05'])
    expect(fails).toBe(0)
    const ups = h.calls.filter((c) => c.op === 'upsert').map((c) => c.arg as { row: { metric_id: string; date: string; value: unknown }; opts: unknown })
    expect(ups.map((u) => [u.row.metric_id, u.row.date])).toEqual([['m1', '2026-10-06'], ['m2', '2026-10-06']])
    expect(ups[0].row.value).toEqual([{ reps: 10, variation: null, time: '09:00' }])
    expect(ups[1].row.value).toBe(10)
    expect(ups[0].opts).toEqual({ onConflict: 'user_id,date,metric_id' })
    const dels = h.calls.filter((c) => c.op === 'delete')
    expect(dels.map((d) => [d.filters.metric_id, d.filters.date])).toEqual([['m1', '2026-10-05'], ['m2', '2026-10-05']])
  })
  it('ошибка записи не бросается наружу, а считается', async () => {
    h.err = { message: 'boom' }
    expect(await syncLinkedMetrics('u', 'ex1', [M('m1')], [E('a', 'ex1', '2026-10-06', [S(5)])], ['2026-10-06'])).toBe(1)
  })
})

describe('linkMetric / unlinkMetric / createLinkedMetric', () => {
  it('привязка пишет source_exercise_id; сегодняшние подходы метрики переносятся в тренировку, если записей за сегодня ещё нет', async () => {
    h.selectData = { value: [{ reps: 12, variation: null, time: '08:10' }] }
    const r = await linkMetric('u', 'ex1', M('m1', 'sets', null), '2026-10-06', [])
    expect(r.imported).toBe(true)
    expect(h.calls.find((c) => c.table === 'metrics' && c.op === 'update')?.arg).toEqual({ source_exercise_id: 'ex1' })
    const ins = h.calls.find((c) => c.table === 'workout_entries' && c.op === 'insert')!.arg as { exercise_id: string; date: string; sets: WorkoutSet[] }
    expect(ins).toMatchObject({ exercise_id: 'ex1', date: '2026-10-06' })
    expect(ins.sets).toEqual([S(12, '08:10')])
  })
  it('если за сегодня уже есть тренировка по упражнению — ничего не импортируем (иначе задвоение)', async () => {
    h.selectData = { value: [{ reps: 12 }] }
    const r = await linkMetric('u', 'ex1', M('m1', 'sets', null), '2026-10-06', [E('a', 'ex1', '2026-10-06', [S(3)])])
    expect(r.imported).toBe(false)
    expect(h.calls.some((c) => c.table === 'workout_entries')).toBe(false)
  })
  it('пустая метрика сегодня — ничего не импортируем', async () => {
    h.selectData = null
    expect((await linkMetric('u', 'ex1', M('m1', 'number', null), '2026-10-06', [])).imported).toBe(false)
  })
  it('ошибка привязки (например, нет колонки) пробрасывается — окно покажет сообщение', async () => {
    h.err = { code: '42703', message: 'column' }
    await expect(linkMetric('u', 'ex1', M('m1'), '2026-10-06', [])).rejects.toMatchObject({ code: '42703' })
  })
  it('отвязка обнуляет ссылку', async () => {
    await unlinkMetric('u', 'm1')
    expect(h.calls.find((c) => c.op === 'update')?.arg).toEqual({ source_exercise_id: null })
  })
  it('новая метрика: тип «Подходы», активна, привязана к упражнению', async () => {
    h.single = { id: 'new', name: 'Планка', icon: '💪', type: 'sets', goal_value: null, source_exercise_id: 'ex9' }
    const m = await createLinkedMetric('u', 'ex9', 'Планка', 7)
    expect(m.id).toBe('new')
    expect(h.calls.find((c) => c.table === 'metrics' && c.op === 'insert')?.arg).toMatchObject({ name: 'Планка', type: 'sets', active: true, position: 7, source_exercise_id: 'ex9', user_id: 'u' })
  })
})
