import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { exerciseMusclesField } from './lib/workouts'
import { getMuscleOverride, setMuscleOverride } from './lib/muscles'
import type { Exercise, ExerciseFormInput } from './lib/types'

// Миграция 038: колонка workout_exercises.muscle_groups; в БД пишем только если она есть, иначе — как в v2.32 (только устройство).
const h = vi.hoisted(() => ({
  rows: [] as unknown[],
  created: null as Record<string, unknown> | null,
  inserted: [] as Record<string, unknown>[],
  updates: [] as { patch: Record<string, unknown>; id: string }[],
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
        maybeSingle: () => Promise.resolve({ data: table === 'profiles' ? { onboarded: true } : h.created, error: null }),
        then: (res: (v: unknown) => unknown) => Promise.resolve({ data: table === 'workout_exercises' ? h.rows : [], error: null }).then(res),
        insert: (row: Record<string, unknown>) => (h.inserted.push(row), Promise.resolve({ error: null })),
        update: (patch: Record<string, unknown>) => ({ eq: (_c: string, id: string) => (h.updates.push({ patch, id }), Promise.resolve({ error: null })) }),
      }
      return chain
    },
  },
}))

const ex = (o: Partial<Exercise>): Exercise => ({ id: 'e1', user_id: 'u', name: 'Wall angels', category: 'upper', tracks_weight: false, unit: '', value_label: null, tracks_duration: false, bilateral: false, created_at: '', ...o }) as unknown as Exercise
const input = (o: Partial<ExerciseFormInput>): ExerciseFormInput => ({ name: 'Wall angels', category: '', tracks_weight: 'no', value_label: '', unit: '', tracks_duration: false, bilateral: false, ...o })
const SYNCED = 'workouts_muscle_groups_synced'

beforeEach(() => {
  localStorage.clear()
  h.rows = []
  h.created = null
  h.inserted = []
  h.updates = []
})

describe('exerciseMusclesField: поле шлём только если колонка уже есть', () => {
  it('не меняем (undefined), нет колонки у строки, нет строки — пусто', () => {
    expect(exerciseMusclesField(undefined, ex({ muscle_groups: ['abs'] }))).toEqual({})
    expect(exerciseMusclesField(['abs'], ex({}))).toEqual({})
    expect(exerciseMusclesField(['abs'], null)).toEqual({})
  })
  it('колонка есть: список копируется, пустой список → null', () => {
    expect(exerciseMusclesField(['abs', 'back'], ex({ muscle_groups: null }))).toEqual({ muscle_groups: ['abs', 'back'] })
    expect(exerciseMusclesField([], ex({ muscle_groups: ['abs'] }))).toEqual({ muscle_groups: null })
  })
})

describe('useWorkouts: запись muscle_groups', () => {
  it('editExercise: колонка есть — в апдейт уходит muscle_groups; колонки нет — апдейт без неё (старая база не падает)', async () => {
    const { useWorkouts } = await import('./lib/useWorkouts')
    const wk = useWorkouts()
    await flushPromises()
    await wk.editExercise(ex({ muscle_groups: null }), input({ muscles: ['shoulders'] }), 'кг', 'Повторы')
    expect(h.updates.at(-1)?.patch.muscle_groups).toEqual(['shoulders'])
    await wk.editExercise(ex({}), input({ muscles: ['shoulders'] }), 'кг', 'Повторы')
    expect('muscle_groups' in (h.updates.at(-1)?.patch ?? {})).toBe(false)
    expect(getMuscleOverride('Wall angels')).toEqual(['shoulders']) // на устройстве сохранено в любом случае
  })

  it('editExercise: сброс (пустой выбор) пишет null в БД', async () => {
    const { useWorkouts } = await import('./lib/useWorkouts')
    const wk = useWorkouts()
    await flushPromises()
    await wk.editExercise(ex({ muscle_groups: ['abs'] }), input({ muscles: [] }), 'кг', 'Повторы')
    expect(h.updates.at(-1)?.patch.muscle_groups).toBeNull()
  })

  it('addExercise: базовая строка без группы, затем патч — если колонка у созданной строки есть', async () => {
    const { useWorkouts } = await import('./lib/useWorkouts')
    const wk = useWorkouts()
    await flushPromises()
    h.created = { id: 'new1', name: 'Wall angels', muscle_groups: null }
    await wk.addExercise('u1', input({ muscles: ['shoulders', 'back'] }), 'кг', 'Повторы')
    expect('muscle_groups' in h.inserted.at(-1)!).toBe(false)
    expect(h.updates.at(-1)).toEqual({ id: 'new1', patch: { muscle_groups: ['shoulders', 'back'] } })
  })

  it('addExercise: колонки у созданной строки нет — патча нет, привязка только локально', async () => {
    const { useWorkouts } = await import('./lib/useWorkouts')
    const wk = useWorkouts()
    await flushPromises()
    h.created = { id: 'new1', name: 'Wall angels' }
    await wk.addExercise('u1', input({ muscles: ['abs'] }), 'кг', 'Повторы')
    expect(h.updates).toHaveLength(0)
    expect(getMuscleOverride('Wall angels')).toEqual(['abs'])
  })
})

describe('useWorkouts: загрузка подтягивает muscle_groups', () => {
  async function loaded() {
    const { useWorkouts } = await import('./lib/useWorkouts')
    const wk = useWorkouts()
    await vi.waitFor(() => expect(wk.auth.value.status).toBe('ready'))
    await flushPromises()
    return wk
  }

  it('значение из БД попадает в локальный слой (привязка с другого устройства)', async () => {
    h.rows = [ex({ id: 'e1', name: 'Wall angels', muscle_groups: ['shoulders', 'back'] })]
    await loaded()
    expect(getMuscleOverride('Wall angels')).toEqual(['shoulders', 'back'])
  })

  it('первый проход: локальные привязки (из v2.32) однократно загружаются в БД, флаг запоминается', async () => {
    setMuscleOverride('Wall angels', ['abs'])
    h.rows = [ex({ id: 'e1', name: 'Wall angels', muscle_groups: null })]
    await loaded()
    expect(h.updates).toEqual([{ id: 'e1', patch: { muscle_groups: ['abs'] } }])
    expect(localStorage.getItem(SYNCED)).toBe('1')
    expect(getMuscleOverride('Wall angels')).toEqual(['abs'])
  })

  it('после первого прохода БД — источник правды: пусто в БД → локальная привязка убирается, ничего не выгружается', async () => {
    localStorage.setItem(SYNCED, '1')
    setMuscleOverride('Wall angels', ['abs'])
    h.rows = [ex({ id: 'e1', name: 'Wall angels', muscle_groups: null })]
    await loaded()
    expect(h.updates).toHaveLength(0)
    expect(getMuscleOverride('Wall angels')).toBeNull()
  })

  it('колонки нет (миграция не применена) — локальная привязка нетронута, в БД ничего не пишется, флаг не ставится', async () => {
    setMuscleOverride('Wall angels', ['abs'])
    h.rows = [ex({ id: 'e1', name: 'Wall angels' })] // без ключа muscle_groups
    await loaded()
    expect(h.updates).toHaveLength(0)
    expect(localStorage.getItem(SYNCED)).toBeNull()
    expect(getMuscleOverride('Wall angels')).toEqual(['abs'])
  })
})
