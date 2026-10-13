import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

// BACKLOG 62.1: у метрики-«числа», связанной с упражнением, на Дашборде есть быстрый ввод подхода; значение дня = сумма повторов всех записей упражнения.
const h = vi.hoisted(() => ({
  entries: [] as { id: string; sets: unknown }[],
  writeError: null as null | { message: string },
  ops: [] as { op: string; table: string; payload?: unknown }[],
}))
vi.mock('./lib/supabase', () => ({
  sb: {
    from: (table: string) => {
      const chain: Record<string, unknown> = {
        select: () => chain,
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
        eq: (col: string) => (col === 'id' ? Promise.resolve({ error: h.writeError }) : chain),
        order: () => Promise.resolve({ data: table === 'workout_entries' ? h.entries : [], error: null }),
        update: (payload: unknown) => (h.ops.push({ op: 'update', table, payload }), chain),
        insert: (payload: unknown) => (h.ops.push({ op: 'insert', table, payload }), Promise.resolve({ error: h.writeError })),
        upsert: (payload: unknown) => (h.ops.push({ op: 'upsert', table, payload }), Promise.resolve({ error: null })),
      }
      return chain
    },
  },
}))

import NumberMetricField from './components/NumberMetricField.vue'
import { useDailyMetrics } from './lib/useDailyMetrics'
import { sumReps } from './lib/linkedSets'
import type { Metric } from './lib/types'

const metric = { id: 'm1', name: 'Отжимания', type: 'number', icon: null, source_exercise_id: 'e1', goal_value: null, options: null } as unknown as Metric

beforeEach(() => {
  localStorage.setItem('site_lang', 'ru')
  h.entries = []
  h.writeError = null
  h.ops = []
})

describe('sumReps', () => {
  it('сумма повторов всех подходов всех записей; битое и пустое не ломает', () => {
    expect(sumReps([{ sets: [{ reps: 10 }, { reps: 5 }] }, { sets: [{ reps: 3 }, { reps: null }] }, { sets: null }, {}])).toBe(18)
  })
})

describe('useDailyMetrics.addLinkedReps', () => {
  async function ready() {
    const u = useDailyMetrics()
    await u.load('u1', '2026-10-09')
    return u
  }
  it('нет записи за день — создаётся запись «Тренировок», значение дня = повторы', async () => {
    const u = await ready()
    expect(await u.addLinkedReps(metric, 12)).toBe(true)
    const ins = h.ops.find((o) => o.op === 'insert' && o.table === 'workout_entries')
    expect(ins?.payload).toMatchObject({ user_id: 'u1', exercise_id: 'e1', date: '2026-10-09' })
    const up = h.ops.find((o) => o.op === 'upsert' && o.table === 'daily_values')
    expect(up?.payload).toMatchObject({ metric_id: 'm1', date: '2026-10-09', value: 12 })
    expect(u.pending.value.m1).toBe(12)
  })
  it('запись есть — подход дописывается, значение = сумма всех подходов дня', async () => {
    h.entries = [{ id: 'w1', sets: [{ reps: 10, weight: null, time: '08:00', duration: null, side: null }] }]
    const u = await ready()
    await u.addLinkedReps(metric, 6)
    expect(h.ops.some((o) => o.op === 'insert')).toBe(false)
    expect(h.ops.find((o) => o.op === 'upsert')?.payload).toMatchObject({ value: 16 })
  })
  it('ошибка записи тренировки — значение дня не трогаем', async () => {
    h.writeError = { message: 'TypeError: Failed to fetch https://x.supabase.co' }
    const u = await ready()
    expect(await u.addLinkedReps(metric, 5)).toBe(false)
    expect(h.ops.some((o) => o.op === 'upsert')).toBe(false)
    expect(String(u.error.value)).not.toContain('supabase')
  })
  it('метрика без связи — ничего не делает', async () => {
    const u = await ready()
    expect(await u.addLinkedReps({ ...metric, source_exercise_id: null } as Metric, 5)).toBe(false)
    expect(h.ops).toHaveLength(0)
  })
})

describe('NumberMetricField: быстрый ввод связанной метрики', () => {
  const mk = () => mount(NumberMetricField, { props: { metric, value: 8 } })
  it('кнопка выключена без положительного числа; «+ подход» отдаёт повторы и чистит поле', async () => {
    const w = mk()
    const btn = w.find('[data-test="number-quick-add"]')
    expect(btn.attributes('disabled')).toBeDefined()
    await w.find('[data-test="number-quick-reps"]').setValue('0')
    expect(btn.attributes('disabled')).toBeDefined()
    await w.find('[data-test="number-quick-reps"]').setValue('15')
    await btn.trigger('click')
    expect(w.emitted('quickAdd')?.[0]).toEqual([15])
    expect((w.find('[data-test="number-quick-reps"]').element as HTMLInputElement).value).toBe('')
  })
  it('Enter тоже добавляет', async () => {
    const w = mk()
    await w.find('[data-test="number-quick-reps"]').setValue('9')
    await w.find('[data-test="number-quick-reps"]').trigger('keydown.enter')
    expect(w.emitted('quickAdd')?.[0]).toEqual([9])
  })
})
