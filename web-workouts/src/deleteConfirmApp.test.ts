import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// BACKLOG 567: удаление упражнения и записи спрашивает подтверждение окном в стиле сайта, а не системным confirm() браузера.
// Пока человек не ответил — в базе ничего не удалено; «Отмена» ничего не удаляет; «Удалить» удаляет.
const h = vi.hoisted(() => ({
  exercises: [] as Record<string, unknown>[],
  entries: [] as Record<string, unknown>[],
  deleted: [] as { table: string; id: string }[],
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
        insert: () => Promise.resolve({ error: null }),
        upsert: () => Promise.resolve({ error: null }),
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        delete: () => ({
          eq: (_c: string, id: string) => {
            h.deleted.push({ table, id })
            return Promise.resolve({ error: null })
          },
        }),
      }
      return chain
    },
  },
}))

import App from './App.vue'
import ExerciseCard from './components/ExerciseCard.vue'
import { todayStr } from './lib/date'

const exercise = { id: 'e1', user_id: 'u1', name: 'Подтягивания', category: 'upper', tracks_weight: false, unit: '', value_label: null, suggested_scheme: null, tracks_duration: false, bilateral: false, created_at: '2026-10-01' }
const entry = { id: 'n1', user_id: 'u1', exercise_id: 'e1', date: todayStr(), sets: [{ reps: 8, weight: null, time: '10:00', duration: null, side: null }], notes: null }

async function mountApp() {
  const w = mount(App, { attachTo: document.body })
  await flushPromises()
  await flushPromises()
  return w
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  document.body.innerHTML = ''
  h.exercises = [exercise]
  h.entries = [entry]
  h.deleted = []
  vi.stubGlobal('confirm', vi.fn(() => true)) // нативное окно не должно вызываться вообще
})

describe('Тренировки: удаление спрашивает подтверждение окном сайта', () => {
  it('упражнение: окно с названием → ничего не удалено, пока не ответили; «Удалить» удаляет', async () => {
    const w = await mountApp()
    w.findComponent(ExerciseCard).vm.$emit('deleteExercise')
    await flushPromises()
    expect(w.find('[data-test="confirm-dialog-text"]').text()).toContain('Подтягивания')
    expect(h.deleted).toEqual([])
    await w.find('[data-test="confirm-dialog-ok"]').trigger('click')
    await flushPromises()
    expect(h.deleted).toEqual([{ table: 'workout_exercises', id: 'e1' }])
    expect(globalThis.confirm).not.toHaveBeenCalled()
    w.unmount()
  })

  it('упражнение: «Отмена» ничего не удаляет', async () => {
    const w = await mountApp()
    w.findComponent(ExerciseCard).vm.$emit('deleteExercise')
    await flushPromises()
    await w.find('[data-test="confirm-dialog-cancel"]').trigger('click')
    await flushPromises()
    expect(h.deleted).toEqual([])
    expect(w.find('[data-test="confirm-dialog"]').exists()).toBe(false)
    w.unmount()
  })

  it('запись: окно, «Отмена» → не удалено, «Удалить» → удалена именно эта запись', async () => {
    const w = await mountApp()
    const card = w.findComponent(ExerciseCard)
    card.vm.$emit('deleteEntry', entry)
    await flushPromises()
    expect(w.find('[data-test="confirm-dialog-text"]').text()).toBe('Удалить эту запись?')
    await w.find('[data-test="confirm-dialog-cancel"]').trigger('click')
    await flushPromises()
    expect(h.deleted).toEqual([])
    card.vm.$emit('deleteEntry', entry)
    await flushPromises()
    await w.find('[data-test="confirm-dialog-ok"]').trigger('click')
    await flushPromises()
    expect(h.deleted).toEqual([{ table: 'workout_entries', id: 'n1' }])
    expect(globalThis.confirm).not.toHaveBeenCalled()
    w.unmount()
  })
})
