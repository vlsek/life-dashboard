import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// BACKLOG 44.5ж, срез 3: «+ подход» во встроенной строке — повторное «Добавить» за день дописывает подход в СЕГОДНЯШНЮЮ запись, а не создаёт вторую
const h = vi.hoisted(() => ({
  exercises: [] as Record<string, unknown>[],
  entries: [] as Record<string, unknown>[],
  updates: [] as { patch: Record<string, unknown>; id: string }[],
  updateError: null as unknown,
  inserted: [] as unknown[],
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
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
          Promise.resolve({ data: table === 'workout_exercises' ? h.exercises : table === 'workout_entries' ? h.entries : [], error: null }).then(res, rej),
        insert: (row: unknown) => {
          h.inserted.push(row)
          if (table === 'workout_entries') h.entries = [...h.entries, { id: 'new' + h.inserted.length, ...(row as Record<string, unknown>) }] // «база» принимает вставку
          return Promise.resolve({ error: null })
        },
        upsert: () => Promise.resolve({ error: null }),
        update: (patch: Record<string, unknown>) => (() => {
        const q: any = {
          eq: (_c: string, id: string) => {
            if (table === 'workout_entries') {
              h.updates.push({ patch, id })
              if (!h.updateError) h.entries = h.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)) // «база» принимает правку
            }
            return Promise.resolve({ error: h.updateError })
          },
        }
        q.match = (o: Record<string, string>) => q.eq('id', o.id) // очередь офлайн-записей (66.5в) отправляет update/delete через .match({...})
        return q
      })(),
      }
      return chain
    },
  },
}))

import App from './App.vue'
import { todayStr } from './lib/date'

const exercise = (o: Record<string, unknown> = {}) => ({ id: 'e1', user_id: 'u1', name: 'Подтягивания', category: 'upper', tracks_weight: false, unit: '', value_label: null, suggested_scheme: null, tracks_duration: false, bilateral: false, created_at: '2026-10-01', ...o })
const set = (reps: number, weight: number | null = null, side: 'L' | 'R' | null = null, time = '10:00') => ({ reps, weight, time, duration: null, side })
const entry = (o: Record<string, unknown> = {}) => ({ id: 'n1', user_id: 'u1', exercise_id: 'e1', date: todayStr(), sets: [set(8)], notes: null, ...o })

async function mountApp() {
  const w = mount(App, { attachTo: document.body })
  await flushPromises()
  await flushPromises()
  return w
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  h.exercises = [exercise()]
  h.entries = [entry()]
  h.updates = []
  h.updateError = null
  h.inserted = []
})

const openRow = async (w: ReturnType<typeof mount>) => {
  await w.find('[data-testid="exercise-add-entry"]').trigger('click')
  await flushPromises()
}
const submit = async (w: ReturnType<typeof mount>, reps: string) => {
  await w.find('[data-testid="inline-reps"]').setValue(reps)
  await w.find('[data-testid="inline-entry"]').trigger('submit')
  await flushPromises()
  await flushPromises()
}
const sets = (p: Record<string, unknown>) => p.sets as { reps: number }[]

describe('встроенная строка: «+ подход» вместо дубля записи', () => {
  it('записи за сегодня нет — создаётся новая (insert), подход один', async () => {
    h.entries = []
    const w = await mountApp()
    await openRow(w)
    await submit(w, '8')
    expect(h.inserted).toHaveLength(1)
    expect(sets(h.inserted[0] as Record<string, unknown>).map((s) => s.reps)).toEqual([8])
    expect(h.updates).toHaveLength(0)
    w.unmount()
  })

  it('запись за сегодня есть — подход дописывается в неё (update), второй записи нет', async () => {
    const w = await mountApp()
    await openRow(w)
    expect(w.find('[data-testid="inline-today"]').text()).toBe('Сегодня: 1 подх.')
    await submit(w, '9')
    expect(h.inserted).toHaveLength(0)
    expect(h.updates).toHaveLength(1)
    expect(h.updates[0].id).toBe('n1')
    expect(sets(h.updates[0].patch).map((s) => s.reps)).toEqual([8, 9])
    w.unmount()
  })

  it('несколько подряд: строка остаётся открытой, счётчик растёт, каждый подход — в ту же запись', async () => {
    const w = await mountApp()
    await openRow(w)
    await submit(w, '9')
    await submit(w, '7')
    expect(h.inserted).toHaveLength(0)
    expect(h.updates).toHaveLength(2)
    expect(sets(h.updates[1].patch).map((s) => s.reps)).toEqual([8, 9, 7])
    expect(w.find('[data-testid="inline-entry"]').exists()).toBe(true)
    expect(w.find('[data-testid="inline-today"]').text()).toBe('Сегодня: 3 подх.')
    expect(w.find('[data-testid="inline-save"]').text()).toBe('+ подход')
    w.unmount()
  })

  it('первая запись и затем «+ подход» из той же строки: insert, потом update этой же записи', async () => {
    h.entries = []
    const w = await mountApp()
    await openRow(w)
    await submit(w, '12')
    await submit(w, '10')
    expect(h.inserted).toHaveLength(1)
    expect(h.updates).toHaveLength(1)
    expect(sets(h.updates[0].patch).map((s) => s.reps)).toEqual([12, 10])
    w.unmount()
  })

  it('запись только за другой день — создаётся новая запись на сегодня, вчерашняя не меняется', async () => {
    h.entries = [entry({ date: '2026-01-01' })]
    const w = await mountApp()
    await openRow(w)
    await submit(w, '8')
    expect(h.inserted).toHaveLength(1)
    expect(h.updates).toHaveLength(0)
    w.unmount()
  })

  it('ошибка при дописывании подхода: строка остаётся открытой, значения на месте, подход не потерян молча', async () => {
    h.updateError = { message: 'boom' }
    const w = await mountApp()
    await openRow(w)
    await submit(w, '9')
    expect(w.find('[data-testid="inline-entry"]').exists()).toBe(true)
    expect((w.find('[data-testid="inline-reps"]').element as HTMLInputElement).value).toBe('9')
    expect(w.find('[data-testid="inline-save"]').attributes('disabled')).toBeUndefined()
    expect(h.inserted).toHaveLength(0)
    w.unmount()
  })
})
