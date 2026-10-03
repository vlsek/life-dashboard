import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { t } from './lib/i18n'
import ExerciseForm from './components/ExerciseForm.vue'
import { MUSCLE_IDS, getMuscleOverride, setMuscleOverride } from './lib/muscles'
import type { Exercise, ExerciseFormInput } from './lib/types'

const ex = (o: Partial<Exercise>): Exercise => ({ id: 'e1', user_id: 'u', name: 'Wall angels', category: 'upper', tracks_weight: false, unit: '', value_label: null, tracks_duration: false, bilateral: false, created_at: '', ...o }) as unknown as Exercise
const saved = (w: ReturnType<typeof mount>) => w.emitted('save')?.[0]?.[0] as ExerciseFormInput
const find = (w: ReturnType<typeof mount>, id: string) => w.find(`[data-testid="${id}"]`)
const submit = (w: ReturnType<typeof mount>) => w.find('form').trigger('submit')
const setName = (w: ReturnType<typeof mount>, v: string) => w.find('input[type="text"]').setValue(v)

describe('ExerciseForm: группы мышц (BACKLOG 22 «12:33»)', () => {
  beforeEach(() => localStorage.clear())

  it('12 кнопок-групп, как на карте мышц; у нового упражнения ни одна не нажата, подсказки без названия нет', () => {
    const w = mount(ExerciseForm, { props: { existing: null } })
    expect(MUSCLE_IDS).toHaveLength(12)
    for (const m of MUSCLE_IDS) expect(find(w, `muscle-${m}`).attributes('aria-pressed'), m).toBe('false')
    expect(find(w, 'muscles-hint').exists()).toBe(false)
    expect(find(w, 'muscles-clear').exists()).toBe(false)
    w.unmount()
  })

  it('узнаваемое название: подсказка «распознано автоматически» с группами', async () => {
    const w = mount(ExerciseForm, { props: { existing: null } })
    await setName(w, 'Отжимания')
    expect(find(w, 'muscles-hint').text()).toBe(`${t('workouts_muscles_pick_auto')} ${t('workouts_muscle_chest')}, ${t('workouts_muscle_triceps')}, ${t('workouts_muscle_shoulders')}`)
    w.unmount()
  })

  it('неизвестное название: подсказка «не распознано — отметь группы»', async () => {
    const w = mount(ExerciseForm, { props: { existing: null } })
    await setName(w, 'Wall angels')
    expect(find(w, 'muscles-hint').text()).toBe(t('workouts_muscles_pick_none'))
    w.unmount()
  })

  it('отметка групп уходит в save в порядке нажатия, подсказка сообщает про свою привязку', async () => {
    const w = mount(ExerciseForm, { props: { existing: null } })
    await setName(w, 'Wall angels')
    await find(w, 'muscle-shoulders').trigger('click')
    await find(w, 'muscle-back').trigger('click')
    expect(find(w, 'muscle-shoulders').attributes('aria-pressed')).toBe('true')
    expect(find(w, 'muscles-hint').text()).toBe(t('workouts_muscles_pick_custom'))
    await submit(w)
    expect(saved(w).muscles).toEqual(['shoulders', 'back'])
    w.unmount()
  })

  it('повторное нажатие снимает группу; «Сбросить на автоматическую» снимает все', async () => {
    const w = mount(ExerciseForm, { props: { existing: null } })
    await setName(w, 'Wall angels')
    await find(w, 'muscle-abs').trigger('click')
    await find(w, 'muscle-abs').trigger('click')
    expect(find(w, 'muscle-abs').attributes('aria-pressed')).toBe('false')
    await find(w, 'muscle-abs').trigger('click')
    await find(w, 'muscle-glutes').trigger('click')
    await find(w, 'muscles-clear').trigger('click')
    await submit(w)
    expect(saved(w).muscles).toEqual([])
    w.unmount()
  })

  it('у существующего упражнения подставляется его сохранённая привязка', async () => {
    setMuscleOverride('Wall angels', ['shoulders', 'back'])
    const w = mount(ExerciseForm, { props: { existing: ex({}) } })
    expect(find(w, 'muscle-shoulders').attributes('aria-pressed')).toBe('true')
    expect(find(w, 'muscle-back').attributes('aria-pressed')).toBe('true')
    expect(find(w, 'muscle-chest').attributes('aria-pressed')).toBe('false')
    await submit(w)
    expect(saved(w).muscles).toEqual(['shoulders', 'back'])
    w.unmount()
  })
})

// Проводка: привязка применяется после УСПЕШНОЙ записи в БД и не трогается без выбора.
const h = vi.hoisted(() => ({ fail: false }))
vi.mock('./lib/supabase', () => ({
  sb: {
    // useWorkouts() при создании вызывает init() → getSession(); вечно ожидающий промис = «сессия ещё грузится» (без редиректа и шума)
    auth: { getSession: () => new Promise(() => {}) },
    from: () => ({
      insert: () => Promise.resolve({ error: h.fail ? { message: 'boom' } : null }),
      update: () => ({ eq: () => Promise.resolve({ error: h.fail ? { message: 'boom' } : null }) }),
    }),
  },
}))
const input = (o: Partial<ExerciseFormInput>): ExerciseFormInput => ({ name: 'Wall angels', category: '', tracks_weight: 'no', value_label: '', unit: '', tracks_duration: false, bilateral: false, ...o })

describe('useWorkouts: сохранение привязки к мышцам', () => {
  beforeEach(() => {
    localStorage.clear()
    h.fail = false
  })

  it('addExercise: выбранные группы сохраняются по названию', async () => {
    const { useWorkouts } = await import('./lib/useWorkouts')
    await useWorkouts().addExercise('u1', input({ muscles: ['shoulders', 'back'] }), 'кг', 'Повторы')
    expect(getMuscleOverride('Wall angels')).toEqual(['shoulders', 'back'])
  })

  it('addExercise без выбора (undefined) и с пустым выбором ничего не пишет', async () => {
    const { useWorkouts } = await import('./lib/useWorkouts')
    await useWorkouts().addExercise('u1', input({}), 'кг', 'Повторы')
    await useWorkouts().addExercise('u1', input({ muscles: [] }), 'кг', 'Повторы')
    expect(getMuscleOverride('Wall angels')).toBeNull()
  })

  it('ошибка записи в БД — привязка не сохраняется', async () => {
    const { useWorkouts } = await import('./lib/useWorkouts')
    h.fail = true
    await expect(useWorkouts().addExercise('u1', input({ muscles: ['abs'] }), 'кг', 'Повторы')).rejects.toBeTruthy()
    expect(getMuscleOverride('Wall angels')).toBeNull()
  })

  it('editExercise: переименование переносит привязку, пустой выбор — снимает, undefined — не трогает', async () => {
    const { useWorkouts } = await import('./lib/useWorkouts')
    setMuscleOverride('Wall angels', ['shoulders'])
    await useWorkouts().editExercise(ex({}), input({ name: 'Wall slides' }), 'кг', 'Повторы')
    expect(getMuscleOverride('Wall angels')).toBeNull()
    expect(getMuscleOverride('Wall slides')).toEqual(['shoulders'])
    await useWorkouts().editExercise(ex({ name: 'Wall slides' }), input({ name: 'Wall slides', muscles: ['abs'] }), 'кг', 'Повторы')
    expect(getMuscleOverride('Wall slides')).toEqual(['abs'])
    await useWorkouts().editExercise(ex({ name: 'Wall slides' }), input({ name: 'Wall slides', muscles: [] }), 'кг', 'Повторы')
    expect(getMuscleOverride('Wall slides')).toBeNull()
  })
})
