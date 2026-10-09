import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// BACKLOG 44.5а «быстрый ввод насквозь»: подход, введённый на Дашборде для метрики, связанной с упражнением, уходит в «Тренировки»,
// а значение метрики пересчитывается из всех записей упражнения за день.
const h = vi.hoisted(() => ({
  entries: [] as { id: string; sets: unknown; created_at?: string }[],
  readError: null as null | { message: string },
  writeError: null as null | { message: string },
  upsertError: null as null | { message: string },
  ops: [] as { op: string; table: string; payload?: unknown; id?: string }[],
}))
vi.mock('./lib/supabase', () => ({
  sb: {
    from: (table: string) => {
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: (col: string, val: string) => {
          if (col === 'id') return Promise.resolve({ error: h.writeError })
          void val
          return chain
        },
        order: () => Promise.resolve(table === 'workout_entries' ? { data: h.readError ? null : h.entries, error: h.readError } : { data: [], error: null }),
        update: (payload: unknown) => (h.ops.push({ op: 'update', table, payload }), chain),
        insert: (payload: unknown) => (h.ops.push({ op: 'insert', table, payload }), Promise.resolve({ error: h.writeError })),
        upsert: (payload: unknown) => (h.ops.push({ op: 'upsert', table, payload }), Promise.resolve({ error: h.upsertError })),
      }
      return chain
    },
  },
}))

import SetsCard from './components/SetsCard.vue'
import { useSets } from './lib/useSets'
import { appendEntrySet, mirrorSets, newEntrySet, parseQuickReps } from './lib/linkedSets'
import type { Metric } from './lib/types'

const metric = { id: 'm1', name: 'Отжимания', type: 'sets', icon: null, source_exercise_id: 'e1', goal_value: null, options: null } as unknown as Metric

beforeEach(() => {
  localStorage.setItem('site_lang', 'ru')
  h.entries = []
  h.readError = null
  h.writeError = null
  h.upsertError = null
  h.ops = []
})

describe('linkedSets: чистые правила', () => {
  it('повторы: только положительное число, запятая допустима', () => {
    expect(parseQuickReps('12')).toBe(12)
    expect(parseQuickReps('7,5')).toBe(7.5)
    for (const bad of ['', '0', '-3', 'abc']) expect(parseQuickReps(bad)).toBeNull()
  })
  it('подход записи тренировки: только повторы и время, остальное пусто', () => {
    expect(newEntrySet(10, new Date(2026, 9, 9, 7, 5))).toEqual({ reps: 10, weight: null, time: '07:05', duration: null, side: null })
  })
  it('дописывание в запись: битые sets не ломают', () => {
    const s = newEntrySet(5)
    expect(appendEntrySet([{ reps: 1 }], s)).toHaveLength(2)
    expect(appendEntrySet(null, s)).toEqual([s])
    expect(appendEntrySet('x', s)).toEqual([s])
  })
  it('зеркало: все записи дня по времени, без времени — после, в порядке записи', () => {
    const rows = mirrorSets([
      { sets: [{ reps: 5, time: null }, { reps: 8, time: '09:00' }] },
      { sets: [{ reps: 3, time: '08:00' }, { reps: 4, time: null }] },
      { sets: null },
    ])
    expect(rows.map((r) => r.reps)).toEqual([3, 8, 5, 4])
    expect(rows.every((r) => r.variation === null)).toBe(true)
  })
})

describe('useSets.addLinkedSet', () => {
  async function ready() {
    const u = useSets()
    // load() без метрик в базе: берём userId/date, метрики подставляем сами
    await u.load('u1', '2026-10-09')
    return u
  }
  it('нет записи за сегодня — создаётся запись «Тренировок» и значение метрики', async () => {
    const u = await ready()
    expect(await u.addLinkedSet(metric, 12)).toBe(true)
    const ins = h.ops.find((o) => o.op === 'insert' && o.table === 'workout_entries')
    expect(ins?.payload).toMatchObject({ user_id: 'u1', exercise_id: 'e1', date: '2026-10-09' })
    expect((ins?.payload as { sets: { reps: number }[] }).sets[0].reps).toBe(12)
    const up = h.ops.find((o) => o.op === 'upsert' && o.table === 'daily_values')
    expect(up?.payload).toMatchObject({ user_id: 'u1', date: '2026-10-09', metric_id: 'm1' })
    expect((up?.payload as { value: { reps: number }[] }).value.map((r) => r.reps)).toEqual([12])
    expect(u.setsByMetric.value.m1.map((r) => r.reps)).toEqual([12])
  })
  it('запись за сегодня есть — подход дописывается в неё, метрика = все подходы дня', async () => {
    h.entries = [{ id: 'w1', sets: [{ reps: 10, weight: null, time: '08:00', duration: null, side: null }] }]
    const u = await ready()
    await u.addLinkedSet(metric, 6)
    expect(h.ops.some((o) => o.op === 'insert')).toBe(false)
    const upd = h.ops.find((o) => o.op === 'update' && o.table === 'workout_entries')
    expect((upd?.payload as { sets: unknown[] }).sets).toHaveLength(2)
    const up = h.ops.find((o) => o.op === 'upsert')
    expect((up?.payload as { value: { reps: number }[] }).value.map((r) => r.reps)).toEqual([10, 6])
  })
  it('ошибка записи тренировки — метрику не трогаем, понятный текст', async () => {
    h.writeError = { message: 'TypeError: Failed to fetch https://x.supabase.co' }
    const u = await ready()
    expect(await u.addLinkedSet(metric, 5)).toBe(false)
    expect(h.ops.some((o) => o.op === 'upsert')).toBe(false)
    expect(u.error.value).toBeTruthy()
    expect(String(u.error.value)).not.toContain('supabase')
  })
  it('ошибка чтения записей — ничего не пишем', async () => {
    h.readError = { message: 'boom' }
    const u = await ready()
    expect(await u.addLinkedSet(metric, 5)).toBe(false)
    expect(h.ops).toHaveLength(0)
  })
  it('метрика без связи — ничего не делает', async () => {
    const u = await ready()
    expect(await u.addLinkedSet({ ...metric, source_exercise_id: null } as Metric, 5)).toBe(false)
    expect(h.ops).toHaveLength(0)
  })
})

describe('SetsCard: быстрый ввод у связанной метрики', () => {
  const mountCard = (m: Metric = metric) => mount(SetsCard, { props: { metric: m, sets: [{ reps: 8, variation: null, time: '08:00' }] } })
  it('кнопка выключена, пока в поле не положительное число; «+ подход» отдаёт повторы и чистит поле', async () => {
    const w = mountCard()
    const btn = w.find('[data-test="sets-quick-add"]')
    expect(btn.attributes('disabled')).toBeDefined()
    await w.find('[data-test="sets-quick-reps"]').setValue('0')
    expect(btn.attributes('disabled')).toBeDefined()
    await w.find('[data-test="sets-quick-reps"]').setValue('15')
    expect(btn.attributes('disabled')).toBeUndefined()
    await btn.trigger('click')
    expect(w.emitted('quickAdd')?.[0]).toEqual([15])
    expect((w.find('[data-test="sets-quick-reps"]').element as HTMLInputElement).value).toBe('')
  })
  it('Enter в поле тоже добавляет', async () => {
    const w = mountCard()
    await w.find('[data-test="sets-quick-reps"]').setValue('9')
    await w.find('[data-test="sets-quick-reps"]').trigger('keydown.enter')
    expect(w.emitted('quickAdd')?.[0]).toEqual([9])
  })
  it('у обычной (не связанной) метрики быстрого ввода нет — там обычная таблица', () => {
    const w = mountCard({ ...metric, source_exercise_id: null } as Metric)
    expect(w.find('[data-test="sets-quick"]').exists()).toBe(false)
    expect(w.find('[data-test="sets-table"]').exists()).toBe(true)
  })
})

void flushPromises
