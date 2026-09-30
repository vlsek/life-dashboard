import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import MuscleMap from './MuscleMap.vue'
import type { Exercise, WorkoutEntry } from '../lib/types'

const mk = (id: string, name: string): Exercise =>
  ({ id, user_id: 'u', name, category: null, tracks_weight: true, value_label: null, unit: null, suggested_scheme: null, created_at: '' }) as Exercise
const bench = mk('bench', 'Жим лёжа')
const squat = mk('squat', 'Приседания')
const yoga = mk('yoga', 'Йога')
const entry = (exercise_id: string, date: string): WorkoutEntry =>
  ({ id: exercise_id + date, user_id: 'u', exercise_id, date, sets: [{ reps: 10, weight: 50, time: null, duration: null, side: null }], notes: null }) as WorkoutEntry

const TODAY = '2026-09-30'
async function openMap(entries: WorkoutEntry[], exercises: Exercise[]) {
  const w = mount(MuscleMap, { props: { entries, exercises, today: TODAY } })
  await w.find('[data-testid="muscle-map-toggle"]').trigger('click')
  return w
}
const zone = (w: ReturnType<typeof mount>, m: string) => w.find(`[data-muscle="${m}"]`)

describe('MuscleMap', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('site_lang', 'ru')
  })

  it('по умолчанию свёрнут; раскрытие сохраняется', async () => {
    const w = mount(MuscleMap, { props: { entries: [], exercises: [bench], today: TODAY } })
    expect(w.find('[data-testid="muscle-map-body"]').exists()).toBe(false)
    await w.find('[data-testid="muscle-map-toggle"]').trigger('click')
    expect(w.find('[data-testid="muscle-map-body"]').exists()).toBe(true)
    expect(localStorage.getItem('workouts_musclemap_open')).toBe('1')
    const w2 = mount(MuscleMap, { props: { entries: [], exercises: [bench], today: TODAY } })
    expect(w2.find('[data-testid="muscle-map-body"]').exists()).toBe(true)
  })

  it('мышцы за последние 4 дня — зелёные, остальные — серые', async () => {
    const w = await openMap([entry('bench', '2026-09-29'), entry('squat', '2026-09-20')], [bench, squat])
    expect(zone(w, 'chest').attributes('data-state')).toBe('done')
    expect(zone(w, 'triceps').attributes('data-state')).toBe('done')
    expect(zone(w, 'quads').attributes('data-state')).toBe('idle') // 10 дней назад
    expect(zone(w, 'calves').attributes('data-state')).toBe('idle')
  })

  it('клик по серой мышце показывает свои упражнения и подсказки; кнопка добавляет запись', async () => {
    const w = await openMap([entry('bench', '2026-09-29')], [bench, squat])
    await zone(w, 'quads').trigger('click')
    const detail = w.find('[data-testid="muscle-detail"]')
    expect(detail.text()).toContain('Квадрицепс')
    expect(detail.text()).toContain('Приседания')
    expect(detail.text()).toContain('Записей пока нет')
    // подсказки не дублируют то, что уже есть у пользователя (приседания)
    const sug = w.find('[data-testid="muscle-suggestions"]').text()
    expect(sug).not.toContain('Приседания')
    expect(sug).toContain('Жим ногами')
    await w.find('[data-testid="muscle-add-entry"]').trigger('click')
    expect(w.emitted('add-entry')?.[0]).toEqual([squat])
  })

  it('если своих упражнений на мышцу нет — говорит об этом, но подсказывает из справочника', async () => {
    const w = await openMap([], [bench])
    await zone(w, 'calves').trigger('click')
    expect(w.find('[data-testid="muscle-detail"]').text()).toContain('Ни одно из ваших упражнений')
    expect(w.find('[data-testid="muscle-suggestions"]').text()).toContain('Подъёмы на носки')
  })

  it('повторный клик снимает выбор; клавиша Enter тоже выбирает', async () => {
    const w = await openMap([], [bench])
    await zone(w, 'chest').trigger('click')
    expect(w.find('[data-testid="muscle-detail"]').exists()).toBe(true)
    await zone(w, 'chest').trigger('click')
    expect(w.find('[data-testid="muscle-detail"]').exists()).toBe(false)
    await zone(w, 'abs').trigger('keydown.enter')
    expect(w.find('[data-testid="muscle-detail"]').exists()).toBe(true)
  })

  it('статистика: чаще всего тренируемые группы за 30 дней и список непривязанных упражнений', async () => {
    const w = await openMap([entry('bench', '2026-09-28'), entry('bench', '2026-09-25'), entry('squat', '2026-09-29')], [bench, squat, yoga])
    const stats = w.find('[data-testid="muscle-stats"]').text()
    expect(stats).toContain('Грудь')
    expect(stats).toContain('2 дн.')
    expect(w.find('[data-testid="muscle-unmapped"]').text()).toContain('Йога')
  })

  it('пустая история — сообщение вместо статистики', async () => {
    const w = await openMap([], [bench])
    expect(w.find('[data-testid="muscle-stats"]').text()).toContain('За 30 дней нет тренировок')
  })
})
