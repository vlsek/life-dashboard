import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// BACKLOG 69.2 срез 2: «Начать тренировку» → упражнение → подход → ✓ → «Завершить» пишет сессию + записи (или записи старого формата без таблицы сессий).
const h = vi.hoisted(() => ({
  exercises: [] as Record<string, unknown>[],
  inserted: [] as { table: string; row: Record<string, unknown> }[],
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
      }
      return chain
    },
  },
}))

import App from './App.vue'
import { useActiveWorkout } from './lib/useActiveWorkout'
import { resetSessionProbe } from './lib/sessionProbe'

const ex = { id: 'e1', user_id: 'u1', name: 'Жим лёжа', category: 'upper', tracks_weight: true, unit: 'kg', value_label: null, suggested_scheme: null, created_at: '2026-01-01' }
async function mountApp() {
  const w = mount(App, { attachTo: document.body })
  await flushPromises(); await flushPromises()
  return w
}
const q = (w: ReturnType<typeof mount>, id: string) => w.find(`[data-testid="${id}"]`)
async function fillAndFinish(w: ReturnType<typeof mount>) {
  await q(w, 'aw-start').trigger('click')
  await q(w, 'aw-add-exercise').trigger('click')
  await q(w, 'aw-pick-e1').trigger('click')
  const inputs = q(w, 'aw-set-0-0').findAll('input')
  await inputs[0].setValue('60')
  await inputs[1].setValue('8')
  await q(w, 'aw-tick-0-0').trigger('click') // ✓
  await q(w, 'aw-finish').trigger('click')
  await flushPromises(); await flushPromises()
}

beforeEach(() => {
  localStorage.clear(); localStorage.setItem('site_lang', 'ru')
  h.exercises = [ex]; h.entries = []; h.inserted = []; h.sessionsTable = true
  useActiveWorkout().discard()
  resetSessionProbe()
})

describe('активная тренировка', () => {
  it('«Начать» открывает экран с секундомером; пустую тренировку «Завершить» не сохраняет', async () => {
    const w = await mountApp()
    await q(w, 'aw-start').trigger('click')
    expect(q(w, 'active-workout').exists()).toBe(true)
    expect(q(w, 'aw-timer').text()).toMatch(/^\d{2}:\d{2}$/)
    await q(w, 'aw-finish').trigger('click'); await flushPromises()
    expect(h.inserted).toHaveLength(0)
    expect(q(w, 'active-workout').exists()).toBe(true) // остаёмся на экране
    w.unmount()
  })

  it('черновик переживает перезагрузку страницы', async () => {
    let w = await mountApp()
    await q(w, 'aw-start').trigger('click')
    expect(localStorage.getItem('workouts.activeDraft.v1')).toContain('"v":1')
    w.unmount()
    w = await mountApp()
    expect(q(w, 'active-workout').exists()).toBe(true)
    w.unmount()
  })

  it('«Завершить» с таблицей сессий: сначала сессия, потом запись с session_id; черновик очищен', async () => {
    const w = await mountApp()
    await fillAndFinish(w)
    expect(h.inserted.map((x) => x.table)).toEqual(['workout_sessions', 'workout_entries'])
    const [s, e] = h.inserted.map((x) => x.row)
    expect(e).toMatchObject({ exercise_id: 'e1', session_id: s.id, position: 0 })
    expect((e.sets as { reps: number; weight: number; done: boolean }[])[0]).toMatchObject({ reps: 8, weight: 60, done: true })
    expect(q(w, 'active-workout').exists()).toBe(false)
    expect(localStorage.getItem('workouts.activeDraft.v1')).toBeNull()
    w.unmount()
  })

  it('без таблицы сессий (миграция 113 не применена): только записи старого формата, без session_id', async () => {
    h.sessionsTable = false
    const w = await mountApp()
    await fillAndFinish(w)
    expect(h.inserted.map((x) => x.table)).toEqual(['workout_entries'])
    expect(h.inserted[0].row).not.toHaveProperty('session_id')
    w.unmount()
  })

  it('рекорд: при ✓ выше прошлого лучшего веса — строка «Рекорд веса» и тост; равный вес — без плашки', async () => {
    h.entries = [{ id: 'old', user_id: 'u1', exercise_id: 'e1', date: '2026-01-01', sets: [{ reps: 8, weight: 60, time: null, duration: null, side: null }], notes: null }]
    const w = await mountApp()
    await q(w, 'aw-start').trigger('click'); await q(w, 'aw-add-exercise').trigger('click'); await q(w, 'aw-pick-e1').trigger('click')
    const inputs = q(w, 'aw-set-0-0').findAll('input')
    await inputs[0].setValue('60'); await inputs[1].setValue('8')
    await q(w, 'aw-tick-0-0').trigger('click')
    expect(q(w, 'aw-pr-0-0').exists()).toBe(false)
    await inputs[0].setValue('62.5')
    expect(q(w, 'aw-pr-0-0').text()).toContain('Рекорд веса')
    expect(q(w, 'aw-pr-0-0').text()).toContain('62,5')
    w.unmount()
  })

  it('рутина: «В рутину» запоминает упражнения, на странице появляется карточка, «Начать» открывает тренировку с этими упражнениями', async () => {
    const w = await mountApp()
    await q(w, 'aw-start').trigger('click'); await q(w, 'aw-add-exercise').trigger('click'); await q(w, 'aw-pick-e1').trigger('click')
    await q(w, 'aw-save-routine').trigger('click')
    await q(w, 'aw-routine-name').setValue('Грудь')
    await q(w, 'aw-routine-ok').trigger('click')
    expect(JSON.parse(localStorage.getItem('workouts.routines.v1')!)[0]).toMatchObject({ name: 'Грудь', items: [{ exercise_id: 'e1' }] })
    w.unmount()
    useActiveWorkout().discard()
    const w2 = await mountApp()
    expect(w2.find('[data-testid="routines"]').text()).toContain('Грудь')
    await w2.find('[data-testid^="routine-start-"]').trigger('click')
    expect(q(w2, 'active-workout').exists()).toBe(true)
    expect(q(w2, 'aw-ex-0').text()).toContain('Жим лёжа')
    w2.unmount()
  })

  it('прошлое: тап по подсказке подставляет числа без ✓; «Подставить прошлое» заполняет пустые подходы', async () => {
    h.entries = [{ id: 'old', user_id: 'u1', exercise_id: 'e1', date: '2026-01-01', sets: [{ reps: 8, weight: 60, time: null, duration: null, side: null }, { reps: 6, weight: 65, time: null, duration: null, side: null }], notes: null }]
    const w = await mountApp()
    await q(w, 'aw-start').trigger('click'); await q(w, 'aw-add-exercise').trigger('click'); await q(w, 'aw-pick-e1').trigger('click')
    await q(w, 'aw-prev-0-0').trigger('click')
    let inputs = q(w, 'aw-set-0-0').findAll('input')
    expect((inputs[0].element as HTMLInputElement).value).toBe('60'); expect((inputs[1].element as HTMLInputElement).value).toBe('8')
    expect(q(w, 'aw-tick-0-0').attributes('aria-pressed')).toBe('false')
    await w.find('[data-testid="aw-ex-0"]').findAll('button').find((b) => b.text() === '+ Подход')!.trigger('click')
    await q(w, 'aw-fill-0').trigger('click')
    inputs = q(w, 'aw-set-0-1').findAll('input')
    expect((inputs[0].element as HTMLInputElement).value).toBe('60') // добавленный подход скопировал 60×8; подставка не затирает введённое
    w.unmount()
  })
})

