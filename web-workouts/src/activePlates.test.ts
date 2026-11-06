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
import PlateCalculator from './components/PlateCalculator.vue'

// BACKLOG 69.15 срез 4: «Блины» у упражнения с весом в активной тренировке открывают калькулятор сразу с рабочим весом.
const ex = { id: 'e1', user_id: 'u1', name: 'Жим лёжа', category: 'upper', tracks_weight: true, unit: 'kg', value_label: null, suggested_scheme: null, created_at: '2026-01-01' }
const pushups = { ...ex, id: 'e2', name: 'Отжимания', tracks_weight: false }
const lbEx = { ...ex, id: 'e3', name: 'Bench lb', unit: 'lb' }
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
  h.exercises = [ex, pushups, lbEx]; h.entries = []; h.inserted = []; h.updated = []; h.sessionsTable = true
  useActiveWorkout().discard()
  resetSessionProbe()
})

describe('PlateCalculator: стартовый вес', () => {
  it('initial подставляется в поле и сразу считает; ноль, null и не заданный — пустое поле', async () => {
    const w = mount(PlateCalculator, { props: { unit: 'кг', initial: 100 } })
    expect((w.get('[data-testid="plates-target"]').element as HTMLInputElement).value).toBe('100')
    expect(w.findAll('[data-testid="plates-row"]').map((r) => r.text())).toEqual(['1 × 25', '1 × 15'])
    for (const initial of [0, null, undefined]) {
      const e = mount(PlateCalculator, { props: { unit: 'кг', initial } })
      expect((e.get('[data-testid="plates-target"]').element as HTMLInputElement).value).toBe('')
      expect(e.find('[data-testid="plates-result"]').exists()).toBe(false)
    }
  })
})

describe('кнопка «Блины» в активной тренировке', () => {
  it('рабочий вес из своего подхода: тап открывает калькулятор с ним, «Закрыть» убирает', async () => {
    const w = await mountApp()
    await startWith(w, 'e1')
    await q(w, 'aw-set-0-0').findAll('input')[0].setValue('100')
    expect(q(w, 'plates-modal').exists()).toBe(false)
    await q(w, 'aw-plates-0').trigger('click')
    expect(q(w, 'plates-modal').exists()).toBe(true)
    expect((q(w, 'plates-target').element as HTMLInputElement).value).toBe('100')
    expect(w.findAll('[data-testid="plates-row"]').map((r) => r.text())).toEqual(['1 × 25', '1 × 15'])
    await q(w, 'plates-close').trigger('click')
    expect(q(w, 'plates-modal').exists()).toBe(false)
    expect(q(w, 'active-workout').exists()).toBe(true) // тренировка продолжается
  })
  it('веса ещё нет и прошлой тренировки нет — калькулятор открывается с пустым полем', async () => {
    const w = await mountApp()
    await startWith(w, 'e1')
    await q(w, 'aw-plates-0').trigger('click')
    expect((q(w, 'plates-target').element as HTMLInputElement).value).toBe('')
  })
  it('вес из прошлой тренировки, если свой ещё не введён', async () => {
    h.entries = [{ id: 'p1', user_id: 'u1', exercise_id: 'e1', date: '2026-10-01', notes: null, sets: [{ reps: 5, weight: 80, time: null, duration: null, side: null, done: true }] }]
    const w = await mountApp()
    await startWith(w, 'e1')
    await q(w, 'aw-plates-0').trigger('click')
    expect((q(w, 'plates-target').element as HTMLInputElement).value).toBe('80')
  })
  it('упражнение без веса — кнопки нет', async () => {
    const w = await mountApp()
    await startWith(w, 'e2')
    expect(q(w, 'aw-plates-0').exists()).toBe(false)
  })
  it('упражнение в фунтах — система lb, гриф 45', async () => {
    const w = await mountApp()
    await startWith(w, 'e3')
    await q(w, 'aw-set-0-0').findAll('input')[0].setValue('225')
    await q(w, 'aw-plates-0').trigger('click')
    expect(w.findAll('[data-testid="plates-bar"]').map((b) => b.text())).toEqual(['45', '35'])
    expect(w.findAll('[data-testid="plates-row"]').map((r) => r.text())).toEqual(['2 × 45'])
  })
})
