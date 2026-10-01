import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { addDaysIso, todayStr } from './date'
import { isTrainedRecently, lastTrainedByMuscle } from './muscleStats'
import { musclesForExercise, type MuscleId } from './muscles'
import MuscleMiniMap from '../components/MuscleMiniMap.vue'
import { t } from './i18n'

const today = todayStr()

describe('справочник и статистика (копия web-workouts)', () => {
  it('упражнение → мышцы по ключевым словам RU/EN', () => {
    expect(musclesForExercise('Подтягивания')).toEqual(['back', 'biceps'])
    expect(musclesForExercise('Bench press')).toContain('chest')
    expect(musclesForExercise('что-то своё')).toEqual([])
  })

  it('«за 4 дня» включает сегодня и три дня назад; пустые записи и будущее не считаются', () => {
    const ex = [{ id: 'a', name: 'Приседания' }, { id: 'b', name: 'Жим лёжа' }]
    const entries = [
      { exercise_id: 'a', date: addDaysIso(today, -3), sets: [{}] },
      { exercise_id: 'b', date: addDaysIso(today, -4), sets: [{}] },
      { exercise_id: 'b', date: addDaysIso(today, 1), sets: [{}] },
      { exercise_id: 'a', date: today, sets: [] },
    ]
    const last = lastTrainedByMuscle(entries, ex, today)
    expect(last.quads).toBe(addDaysIso(today, -3))
    expect(isTrainedRecently(last.quads, today)).toBe(true)
    expect(last.chest).toBe(addDaysIso(today, -4))
    expect(isTrainedRecently(last.chest, today)).toBe(false)
  })
})

describe('MuscleMiniMap', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('site_lang', 'ru')
  })

  it('рисует две фигуры; задействованная мышца помечена done, остальные idle', () => {
    const w = mount(MuscleMiniMap, { props: { done: new Set<MuscleId>(['chest']), last: { chest: today } } })
    expect(w.findAll('svg')).toHaveLength(2)
    expect(w.findAll('[data-muscle="chest"]').every((g) => g.attributes('data-state') === 'done')).toBe(true)
    expect(w.findAll('[data-muscle="quads"]').every((g) => g.attributes('data-state') === 'idle')).toBe(true)
    expect(w.find('[data-test="muscle-hint"]').exists()).toBe(true)
    w.unmount()
  })

  it('клик по мышце показывает название и дату последней тренировки (или «нет записей»); повторный клик скрывает', async () => {
    const w = mount(MuscleMiniMap, { props: { done: new Set<MuscleId>(), last: { chest: '2026-09-28' } } })
    await w.find('[data-muscle="chest"]').trigger('click')
    expect(w.find('[data-test="muscle-detail"]').text()).toContain('2026-09-28')
    await w.find('[data-muscle="abs"]').trigger('click')
    expect(w.find('[data-test="muscle-detail"]').text()).toContain(t('workouts_muscles_never'))
    await w.find('[data-muscle="abs"]').trigger('click')
    expect(w.find('[data-test="muscle-detail"]').exists()).toBe(false)
    w.unmount()
  })

  it('есть ссылка на страницу Тренировок', () => {
    const w = mount(MuscleMiniMap, { props: { done: new Set<MuscleId>(), last: {} } })
    expect(w.find('[data-test="muscle-open-workouts"]').attributes('href')).toBe('/workouts/')
    w.unmount()
  })
})
