import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { t } from './lib/i18n'
import ExerciseForm from './components/ExerciseForm.vue'
import type { Exercise, ExerciseFormInput } from './lib/types'

const ex = (o: Partial<Exercise>): Exercise => ({ id: 'e1', user_id: 'u', name: 'Push-ups', category: 'upper', tracks_weight: true, unit: 'кг', value_label: null, tracks_duration: false, bilateral: false, created_at: '', ...o }) as unknown as Exercise
const saved = (w: ReturnType<typeof mount>) => w.emitted('save')?.[0]?.[0] as ExerciseFormInput
const submit = (w: ReturnType<typeof mount>) => w.find('form').trigger('submit')
const find = (w: ReturnType<typeof mount>, id: string) => w.find(`[data-testid="${id}"]`)

describe('ExerciseForm: единица веса — по умолчанию кг + карандашик (BACKLOG 18)', () => {
  beforeEach(() => localStorage.clear())

  it('новое упражнение: единица показана текстом (по умолчанию «кг»/«kg»), поле ввода не просит её набирать', () => {
    const w = mount(ExerciseForm, { props: { existing: null } })
    expect(find(w, 'unit-value').text()).toBe(t('workouts_default_unit'))
    expect(find(w, 'unit-edit').exists()).toBe(true)
    expect(find(w, 'unit-select').exists()).toBe(false)
    expect(find(w, 'unit-custom').exists()).toBe(false)
    w.unmount()
  })

  it('карандашик открывает выбор единицы; выбор «lb» сохраняется и запоминается для следующих упражнений', async () => {
    const w = mount(ExerciseForm, { props: { existing: null } })
    await w.find('input[type="text"]').setValue('Squat')
    await find(w, 'unit-edit').trigger('click')
    const select = find(w, 'unit-select')
    expect(select.exists()).toBe(true)
    await select.setValue('lb')
    await submit(w)
    expect(saved(w).unit).toBe('lb')
    expect(localStorage.getItem('workouts_weight_unit')).toBe('lb')
    w.unmount()

    const next = mount(ExerciseForm, { props: { existing: null } })
    expect(find(next, 'unit-value').text()).toBe('lb') // следующее упражнение сразу с запомненной единицей
    next.unmount()
  })

  it('«Другая…» — своя единица текстом', async () => {
    const w = mount(ExerciseForm, { props: { existing: null } })
    await w.find('input[type="text"]').setValue('Deadlift')
    await find(w, 'unit-edit').trigger('click')
    await find(w, 'unit-select').setValue('__other__')
    await find(w, 'unit-custom').setValue('пуд')
    await submit(w)
    expect(saved(w).unit).toBe('пуд')
    w.unmount()
  })

  it('без смены единицы сохраняется «по умолчанию»', async () => {
    const w = mount(ExerciseForm, { props: { existing: null } })
    await w.find('input[type="text"]').setValue('Bench')
    await submit(w)
    expect(saved(w).unit).toBe(t('workouts_default_unit'))
    w.unmount()
  })

  it('«Без веса» (только повторения): единица не спрашивается, вместо неё подсказка, в базу уходит пустая единица', async () => {
    const w = mount(ExerciseForm, { props: { existing: null } })
    await w.find('input[type="text"]').setValue('Push-ups')
    await w.findAll('select').find((s) => s.findAll('option').some((o) => o.attributes('value') === 'no'))!.setValue('no')
    expect(find(w, 'unit-row').exists()).toBe(false)
    expect(find(w, 'unit-no-weight-hint').exists()).toBe(true)
    await submit(w)
    expect(saved(w).tracks_weight).toBe('no')
    expect(saved(w).unit).toBe('')
    w.unmount()
  })

  it('старое упражнение без веса с сохранённой «кг»: при правке единица очищается, «раз» — сохраняется', async () => {
    const bad = mount(ExerciseForm, { props: { existing: ex({ tracks_weight: false, unit: 'кг' }) } })
    await submit(bad)
    expect(saved(bad).unit).toBe('')
    bad.unmount()
    const custom = mount(ExerciseForm, { props: { existing: ex({ tracks_weight: false, unit: 'раз' }) } })
    await submit(custom)
    expect(saved(custom).unit).toBe('раз')
    custom.unmount()
  })

  it('упражнение с весом и нестандартной единицей («пуд») открывается с ней и не теряет её', async () => {
    const w = mount(ExerciseForm, { props: { existing: ex({ unit: 'пуд' }) } })
    expect(find(w, 'unit-value').text()).toBe('пуд')
    await submit(w)
    expect(saved(w).unit).toBe('пуд')
    w.unmount()
  })
})

// Проводка: что именно уходит в таблицу workout_exercises.
const h = vi.hoisted(() => ({ inserted: null as any, updated: null as any }))
vi.mock('./lib/supabase', () => ({
  sb: {
    from: () => ({
      insert: (row: any) => ((h.inserted = row), Promise.resolve({ error: null })),
      update: (row: any) => ((h.updated = row), { eq: () => Promise.resolve({ error: null }) }),
    }),
  },
}))

describe('useWorkouts: колонка unit', () => {
  it('addExercise: без веса → пустая единица; с весом → выбранная', async () => {
    const { useWorkouts } = await import('./lib/useWorkouts')
    const wk = useWorkouts()
    await wk.addExercise('u1', { name: 'Push-ups', category: '', tracks_weight: 'no', value_label: '', unit: 'кг', tracks_duration: false, bilateral: false } as ExerciseFormInput, 'кг', 'Повторы')
    expect(h.inserted.unit).toBe('')
    expect(h.inserted.tracks_weight).toBe(false)
    await wk.addExercise('u1', { name: 'Squat', category: '', tracks_weight: 'yes', value_label: '', unit: 'lb', tracks_duration: false, bilateral: false } as ExerciseFormInput, 'кг', 'Повторы')
    expect(h.inserted.unit).toBe('lb')
  })
  it('editExercise: перевод упражнения в «без веса» очищает единицу', async () => {
    const { useWorkouts } = await import('./lib/useWorkouts')
    const wk = useWorkouts()
    await wk.editExercise(ex({ unit: 'кг' }), { name: 'Push-ups', category: '', tracks_weight: 'no', value_label: '', unit: '', tracks_duration: false, bilateral: false } as ExerciseFormInput, 'кг', 'Повторы')
    expect(h.updated.unit).toBe('')
  })
})
