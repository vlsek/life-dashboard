import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ExercisePicker from './components/ExercisePicker.vue'
import ExerciseForm from './components/ExerciseForm.vue'
import { EXERCISE_REFERENCE, MUSCLE_IDS, musclesForExercise, ruleForExercise, type MuscleId } from './lib/muscles'
import { FRONT_SHAPES, BACK_SHAPES } from './lib/muscleShapes'
import { VARIANT_BASES, baseForName, baseName, typicalDefaults } from './lib/exerciseVariants'
import type { Exercise } from './lib/types'

// BACKLOG 763 (срез 1): в форме «Добавить упражнение» — подбор типового упражнения по схеме тела
// (зелёные — тренировали за 4 дня, серые — «что не зелёное»).
const pickerOf = (recent: MuscleId[] = []) => mount(ExercisePicker, { props: { recent } })

describe('ExercisePicker: схема', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('site_lang', 'ru')
  })

  it('рисует все мышцы спереди и сзади; тренированные за 4 дня — done, остальные — idle', () => {
    const w = pickerOf(['chest', 'back'])
    const shapes = [...FRONT_SHAPES, ...BACK_SHAPES]
    expect(w.findAll('[data-muscle]')).toHaveLength(shapes.length)
    for (const el of w.findAll('[data-muscle="chest"]')) expect(el.attributes('data-state')).toBe('done')
    for (const el of w.findAll('[data-muscle="glutes"]')) expect(el.attributes('data-state')).toBe('idle')
    // и цвет действительно разный: недавние — зелёные (success), остальные — серые (text-dim)
    expect(w.find('[data-muscle="chest"] path').attributes('style')).toContain('var(--success)')
    expect(w.find('[data-muscle="glutes"] path').attributes('style')).toContain('var(--text-dim)')
  })

  it('нажатие на мышцу выбирает её (aria-pressed), повторное — снимает; предложения только после выбора', async () => {
    const w = pickerOf()
    expect(w.find('[data-testid="picker-suggestions"]').exists()).toBe(false)
    await w.find('[data-muscle="chest"]').trigger('click')
    expect(w.find('[data-muscle="chest"]').attributes('aria-pressed')).toBe('true')
    expect(w.find('[data-muscle="chest"]').attributes('data-state')).toBe('selected')
    expect(w.find('[data-testid="picker-suggestions"]').exists()).toBe(true)
    await w.find('[data-muscle="chest"]').trigger('click')
    expect(w.find('[data-testid="picker-suggestions"]').exists()).toBe(false)
  })

  it('предложения — только упражнения, где выбранная мышца задействована; нажатие шлёт название и id типового', async () => {
    const w = pickerOf()
    await w.find('[data-muscle="chest"]').trigger('click')
    const buttons = w.findAll('[data-testid^="suggest-"]')
    expect(buttons.length).toBeGreaterThan(0)
    for (const b of buttons) expect(musclesForExercise(b.text()), b.text()).toContain('chest')
    await w.find('[data-testid="suggest-base:pushup"]').trigger('click')
    expect(w.emitted('pick')?.[0]).toEqual([baseName(VARIANT_BASES.find((x) => x.id === 'pushup')!), 'pushup'])
  })

  it('«что я не тренировал» выделяет ровно серые мышцы; «сбросить» снимает выбор', async () => {
    const recent: MuscleId[] = ['chest', 'back', 'abs']
    const w = pickerOf(recent)
    await w.find('[data-testid="picker-untrained"]').trigger('click')
    for (const m of MUSCLE_IDS) {
      const states = w.findAll(`[data-muscle="${m}"]`).map((e) => e.attributes('aria-pressed'))
      for (const s of states) expect(s, m).toBe(recent.includes(m) ? 'false' : 'true')
    }
    await w.find('[data-testid="picker-clear"]').trigger('click')
    expect(w.findAll('[aria-pressed="true"]')).toHaveLength(0)
  })

  it('икры (нет «типового», но есть в справочнике мышц) тоже получают предложение «Подъёмы на носки»', async () => {
    const w = pickerOf()
    await w.find('[data-muscle="calves"]').trigger('click')
    expect(w.find('[data-testid="suggest-ref:calf_raise"]').exists()).toBe(true)
    await w.find('[data-testid="suggest-ref:calf_raise"]').trigger('click')
    expect(w.emitted('pick')?.[0]).toEqual(['Подъёмы на носки', null])
  })
})

describe('каталог подбора (страж)', () => {
  it('у КАЖДОЙ мышцы есть хотя бы одно предложение — схема нигде не упирается в «ничего нет»', async () => {
    for (const m of MUSCLE_IDS) {
      const w = pickerOf()
      await w.find(`[data-muscle="${m}"]`).trigger('click')
      expect(w.findAll('[data-testid^="suggest-"]').length, m).toBeGreaterThan(0)
    }
  })
  it('название каждого упражнения справочника узнаётся картой мышц (иначе после выбора мышцы не подсветятся)', () => {
    for (const r of EXERCISE_REFERENCE) {
      expect(ruleForExercise(r.ru)?.muscles, r.id + ' ru').toEqual(r.muscles)
      expect(ruleForExercise(r.en)?.muscles, r.id + ' en').toEqual(r.muscles)
    }
  })
})

describe('ExerciseForm: подбор по схеме тела', () => {
  const existing: Exercise = { id: 'e1', name: 'Присед', category: 'lower', tracks_weight: true } as unknown as Exercise
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('site_lang', 'ru')
  })

  it('в НОВОМ упражнении с пустым названием есть кнопка; в существующем и после ввода названия её нет', async () => {
    const w = mount(ExerciseForm, { props: { existing: null, recentMuscles: [] } })
    expect(w.find('[data-testid="body-picker-open"]').exists()).toBe(true)
    await w.find('input[type="text"]').setValue('Своё')
    expect(w.find('[data-testid="body-picker-field"]').exists()).toBe(false)
    expect(mount(ExerciseForm, { props: { existing } }).find('[data-testid="body-picker-field"]').exists()).toBe(false)
  })

  it('кнопка открывает схему; выбор типового подставляет название и поля (как из списка) и закрывает схему', async () => {
    const w = mount(ExerciseForm, { props: { existing: null, recentMuscles: ['back'] } })
    await w.find('[data-testid="body-picker-open"]').trigger('click')
    expect(w.find('[data-testid="exercise-picker"]').exists()).toBe(true)
    await w.find('[data-muscle="chest"]').trigger('click')
    await w.find('[data-testid="suggest-base:pushup"]').trigger('click')
    const base = VARIANT_BASES.find((b) => b.id === 'pushup')!
    expect((w.find('input[type="text"]').element as HTMLInputElement).value).toBe(baseName(base))
    expect(baseForName(baseName(base))?.id).toBe('pushup')
    expect(typicalDefaults(base, -1).tracksWeight).toBe(false) // отжимания — на своём весе
    expect(w.find('[data-testid="exercise-picker"]').exists()).toBe(false)
    expect(w.find('[data-testid="typical-autofill-hint"]').exists()).toBe(true) // поля автозаполнены
  })

  it('упражнение из справочника без «типового» подставляет только название', async () => {
    const w = mount(ExerciseForm, { props: { existing: null, recentMuscles: [] } })
    await w.find('[data-testid="body-picker-open"]').trigger('click')
    await w.find('[data-muscle="calves"]').trigger('click')
    await w.find('[data-testid="suggest-ref:calf_raise"]').trigger('click')
    expect((w.find('input[type="text"]').element as HTMLInputElement).value).toBe('Подъёмы на носки')
    expect(w.find('[data-testid="exercise-picker"]').exists()).toBe(false)
  })
})
