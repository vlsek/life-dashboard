import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// BACKLOG 69.2 срез 2: «Начать тренировку» → упражнение → подход → ✓ → «Завершить» пишет сессию + записи (или записи старого формата без таблицы сессий).
const h = vi.hoisted(() => ({
  exercises: [] as Record<string, unknown>[],
  inserted: [] as { table: string; row: Record<string, unknown> }[],
  updated: [] as { table: string; row: Record<string, unknown>; match: unknown }[],
  sessionsTable: true,
  entries: [] as Record<string, unknown>[],
}))

vi.mock('./lib/supabase', () => ({
  sb: {
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'u1', email: 'a@b.c' } } } }) },
    from: (table: string) => {
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: () => chain,
        order: () => chain,
        limit: () => chain,
        maybeSingle: () => Promise.resolve({ data: table === 'profiles' ? { onboarded: true, workout_program: null } : null, error: null }),
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => {
          if (table === 'workout_sessions' && !h.sessionsTable) return Promise.resolve({ data: null, error: { code: 'PGRST205', message: 'Could not find the table in the schema cache' } }).then(res, rej)
          return Promise.resolve({ data: table === 'workout_exercises' ? h.exercises : table === 'workout_entries' ? h.entries : [], error: null }).then(res, rej)
        },
        insert: (row: Record<string, unknown>) => (h.inserted.push({ table, row }), Promise.resolve({ error: null })),
        upsert: () => Promise.resolve({ error: null }),
        update: (row: Record<string, unknown>) => ({ match: (m: unknown) => (h.updated.push({ table, row, match: m }), Promise.resolve({ error: null })) }),
      }
      return chain
    },
  },
}))

import App from './App.vue'
import { useActiveWorkout } from './lib/useActiveWorkout'
import { resetSessionProbe } from './lib/sessionProbe'

// BACKLOG 69.15 срез 2: кнопка «Разминка» в активной тренировке вставляет подходы W от рабочего веса.
const ex = { id: 'e1', user_id: 'u1', name: 'Жим лёжа', category: 'upper', tracks_weight: true, unit: 'kg', value_label: null, suggested_scheme: null, created_at: '2026-01-01' }
const pushups = { ...ex, id: 'e2', name: 'Отжимания', tracks_weight: false }
async function mountApp() {
  const w = mount(App, { attachTo: document.body })
  await flushPromises(); await flushPromises()
  return w
}
const q = (w: ReturnType<typeof mount>, id: string) => w.find(`[data-testid="${id}"]`)
async function startWith(w: ReturnType<typeof mount>, pick: string) {
  await q(w, 'aw-start').trigger('click')
  await q(w, 'aw-add-exercise').trigger('click')
  await q(w, `aw-pick-${pick}`).trigger('click')
}

beforeEach(() => {
  localStorage.clear(); localStorage.setItem('site_lang', 'ru')
  h.exercises = [ex, pushups]; h.entries = []; h.inserted = []; h.updated = []; h.sessionsTable = true
  useActiveWorkout().discard()
  resetSessionProbe()
})

describe('кнопка «Разминка»', () => {
  it('пока веса нет — кнопки нет; ввели вес — появилась; тап вставляет W-подходы в начало, кнопка исчезает', async () => {
    const w = await mountApp()
    await startWith(w, 'e1')
    expect(q(w, 'aw-warmup-0').exists()).toBe(false)
    await q(w, 'aw-set-0-0').findAll('input')[0].setValue('100')
    expect(q(w, 'aw-warmup-0').exists()).toBe(true)
    await q(w, 'aw-warmup-0').trigger('click')
    const sets = useActiveWorkout().draft.value!.exercises[0].sets
    expect(sets.map((s) => [s.weight, s.reps, s.type ?? null])).toEqual([[40, 8, 'warmup'], [60, 5, 'warmup'], [80, 3, 'warmup'], [100, null, null]])
    expect(sets.every((s) => s.done === false)).toBe(true)
    expect(q(w, 'aw-warmup-0').exists()).toBe(false)
  })
  it('упражнение без веса — кнопки нет', async () => {
    const w = await mountApp()
    await startWith(w, 'e2')
    await q(w, 'aw-set-0-0').findAll('input')[0].setValue('15')
    expect(q(w, 'aw-warmup-0').exists()).toBe(false)
  })
  it('вес берётся из прошлой тренировки, если свой ещё не введён', async () => {
    h.entries = [{ id: 'p1', user_id: 'u1', exercise_id: 'e1', date: '2026-10-01', notes: null, sets: [{ reps: 5, weight: 80, time: null, duration: null, side: null, done: true }] }]
    const w = await mountApp()
    await startWith(w, 'e1')
    expect(q(w, 'aw-warmup-0').exists()).toBe(true)
    await q(w, 'aw-warmup-0').trigger('click')
    expect(useActiveWorkout().draft.value!.exercises[0].sets.slice(0, 3).map((s) => s.weight)).toEqual([32.5, 47.5, 65])
  })
})
