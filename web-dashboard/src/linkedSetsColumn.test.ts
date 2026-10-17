import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// BACKLOG 63.2: подходы связанной метрики — «столбиком», как у обычной: правка строки (повторы, время, особенность), «+ подход», удаление.
// Источник правды — записи «Тренировок»; значение метрики пересчитывается из них.
const h = vi.hoisted(() => ({
  entries: [] as { id: string; sets: unknown }[],
  readError: null as null | { message: string },
  writeError: null as null | { message: string },
  ops: [] as { op: string; table: string; payload?: unknown; id?: string }[],
}))
vi.mock('./lib/supabase', () => ({
  sb: {
    from: (table: string) => {
      let pending = ''
      let payload: unknown
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: (col: string, val: string) => {
          if (col === 'id') {
            h.ops.push({ op: pending, table, payload, id: val })
            return Promise.resolve({ error: h.writeError })
          }
          return chain
        },
        order: () => Promise.resolve(table === 'workout_entries' ? { data: h.readError ? null : h.entries, error: h.readError } : { data: [], error: null }),
        update: (p: unknown) => ((pending = 'update'), (payload = p), chain),
        delete: () => ((pending = 'delete'), chain),
        insert: (p: unknown) => (h.ops.push({ op: 'insert', table, payload: p }), Promise.resolve({ error: h.writeError })),
        upsert: (p: unknown) => (h.ops.push({ op: 'upsert', table, payload: p }), Promise.resolve({ error: null })),
      }
      return chain
    },
  },
}))

import SetsCard from './components/SetsCard.vue'
import { useSets } from './lib/useSets'
import { addDayRow, editDayRow, mirrorSets, removeDayRow } from './lib/linkedSets'
import type { Metric } from './lib/types'

const metric = { id: 'm1', name: 'Отжимания', type: 'sets', icon: null, source_exercise_id: 'e1', goal_value: null, options: null } as unknown as Metric
const set = (reps: number, time: string | null, extra: object = {}) => ({ reps, weight: null, time, duration: null, side: null, ...extra })

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 9, 12, 0, 0))
  localStorage.setItem('site_lang', 'ru')
  h.entries = []
  h.readError = null
  h.writeError = null
  h.ops = []
})

describe('linkedSets: правка дня по номеру строки', () => {
  const entries = [
    { id: 'a', sets: [set(5, null), set(8, '09:00')] },
    { id: 'b', sets: [set(3, '08:00', { variation: 'узкий хват', weight: 10 })] },
  ]
  it('строки идут по времени: 3 (08:00), 8 (09:00), 5 (без времени); особенность в зеркале', () => {
    const rows = mirrorSets(entries)
    expect(rows.map((r) => r.reps)).toEqual([3, 8, 5])
    expect(rows[0].variation).toBe('узкий хват')
  })
  it('правка повторов строки 1 меняет подход 09:00 в записи a, остальное не трогает', () => {
    const e = editDayRow(entries, 1, { reps: 12 })!
    expect(e.update).toHaveLength(1)
    expect(e.update[0].id).toBe('a')
    expect(e.update[0].sets.map((s) => s.reps)).toEqual([5, 12])
    expect(mirrorSets(e.rows).map((r) => r.reps)).toEqual([3, 12, 5])
  })
  it('особенность: задать (с обрезкой пробелов) и очистить; вес подхода сохраняется', () => {
    const a = editDayRow(entries, 0, { variation: ' медленно ' })!
    expect(a.update[0].sets[0]).toMatchObject({ variation: 'медленно', weight: 10, reps: 3 })
    const b = editDayRow(entries, 0, { variation: null })!
    expect('variation' in (b.update[0].sets[0] as object)).toBe(false)
  })
  it('удаление: подход уходит; пустая запись удаляется целиком', () => {
    const one = removeDayRow(entries, 2)!
    expect(one.update[0].sets).toHaveLength(1)
    const empty = removeDayRow(entries, 0)!
    expect(empty.remove).toEqual(['b'])
    expect(empty.rows).toHaveLength(1)
    expect(removeDayRow(entries, 9)).toBeNull()
  })
  it('«+ подход»: копия последнего подхода дня с новым временем; дня нет — пустой подход в новой записи', () => {
    const e = addDayRow(entries)!
    expect(e.update[0].id).toBe('b') // последняя запись дня
    const copy = e.update[0].sets[1]
    expect(copy).toMatchObject({ reps: 5, time: '12:00' }) // последним по времени был подход без времени (5)
    const first = addDayRow([])
    expect(first.insert).toHaveLength(1)
    expect(first.insert![0]).toMatchObject({ reps: null, time: '12:00' })
  })
})

describe('useSets: правка связанной метрики', () => {
  async function ready() {
    const u = useSets()
    await u.load('u1', '2026-10-09')
    return u
  }
  it('правка повторов: запись «Тренировок» обновлена, метрика = подходы дня', async () => {
    h.entries = [{ id: 'w1', sets: [set(10, '08:00'), set(6, '08:30')] }]
    const u = await ready()
    expect(await u.editLinkedRow(metric, 1, { reps: 9 })).toBe(true)
    const upd = h.ops.find((o) => o.op === 'update' && o.table === 'workout_entries')
    expect(upd?.id).toBe('w1')
    expect((upd?.payload as { sets: { reps: number }[] }).sets.map((s) => s.reps)).toEqual([10, 9])
    const up = h.ops.find((o) => o.op === 'upsert')
    expect((up?.payload as { value: { reps: number }[] }).value.map((r) => r.reps)).toEqual([10, 9])
    expect(u.setsByMetric.value.m1.map((r) => r.reps)).toEqual([10, 9])
  })
  it('удаление последнего подхода записи удаляет запись', async () => {
    h.entries = [{ id: 'w1', sets: [set(10, '08:00')] }]
    const u = await ready()
    expect(await u.removeLinkedRow(metric, 0)).toBe(true)
    expect(h.ops.some((o) => o.op === 'delete' && o.id === 'w1')).toBe(true)
    expect(u.setsByMetric.value.m1).toEqual([])
  })
  it('«+ подход» при пустом дне создаёт запись', async () => {
    const u = await ready()
    expect(await u.addLinkedRow(metric)).toBe(true)
    expect(h.ops.find((o) => o.op === 'insert' && o.table === 'workout_entries')?.payload).toMatchObject({ user_id: 'u1', exercise_id: 'e1', date: '2026-10-09' })
  })
  it('ошибка записи — метрику не трогаем, понятный текст без адреса сервера', async () => {
    h.entries = [{ id: 'w1', sets: [set(10, '08:00')] }]
    h.writeError = { message: 'TypeError: Failed to fetch https://x.supabase.co' }
    const u = await ready()
    expect(await u.editLinkedRow(metric, 0, { reps: 3 })).toBe(false)
    expect(h.ops.some((o) => o.op === 'upsert')).toBe(false)
    expect(String(u.error.value)).not.toContain('supabase')
  })
  it('ошибка чтения — ничего не пишем; метрика без связи — ничего не делает', async () => {
    h.readError = { message: 'boom' }
    const u = await ready()
    expect(await u.editLinkedRow(metric, 0, { reps: 3 })).toBe(false)
    expect(h.ops).toHaveLength(0)
    expect(await u.addLinkedRow({ ...metric, source_exercise_id: null } as Metric)).toBe(false)
  })
})

describe('SetsCard связанной метрики', () => {
  const rows = [{ reps: 8, variation: 'узкий хват', time: '08:00' }, { reps: 6, variation: null, time: '08:30' }]
  it('строки такие же, как у обычной: время, повторы, особенность, крестик; «Добавить подход»; ссылка в «Тренировки»', () => {
    const w = mount(SetsCard, { props: { metric, sets: rows } })
    expect(w.findAll('[data-test="set-row"]')).toHaveLength(2)
    expect(w.findAll('[data-test="set-plate-variation"]')).toHaveLength(2)
    expect(w.findAll('button.danger')).toHaveLength(2)
    expect(w.find('[data-test="sets-add"]').exists()).toBe(true)
    expect(w.find('[data-test="sets-linked-open"]').attributes('href')).toBe('/workouts/')
  })
  it('правка повторов, «+ подход» и крестик уходят событиями по номеру строки', async () => {
    const w = mount(SetsCard, { props: { metric, sets: rows } })
    const reps = w.findAll('[data-test="set-plate-reps"] input')[1]
    ;(reps.element as HTMLInputElement).value = '9'
    await reps.trigger('change')
    expect(w.emitted('rowEdit')![0]).toEqual([1, { reps: 9 }])
    await w.find('[data-test="sets-add"]').trigger('click')
    expect(w.emitted('rowAdd')).toHaveLength(1)
    await w.findAll('button.danger')[0].trigger('click')
    expect(w.emitted('rowRemove')![0]).toEqual([0])
    expect(w.emitted('change')).toBeUndefined()
    await flushPromises()
  })
  it('у обычной метрики прежнее поведение: change целиком, без сообщений по строкам', async () => {
    const w = mount(SetsCard, { props: { metric: { ...metric, source_exercise_id: null } as Metric, sets: rows } })
    await w.find('[data-test="sets-add"]').trigger('click')
    expect((w.emitted('change')![0][0] as unknown[]).length).toBe(3)
    expect(w.emitted('rowAdd')).toBeUndefined()
    expect(w.find('[data-test="sets-linked-hint"]').exists()).toBe(false)
  })
})
