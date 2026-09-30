import { describe, expect, it } from 'vitest'
import { EXERCISE_REFERENCE, MUSCLE_IDS, musclesForExercise, referenceFor, ruleForExercise } from './muscles'
import { BACK_SHAPES, FRONT_SHAPES } from './muscleShapes'
import { WORKOUT_TEMPLATES_EN, WORKOUT_TEMPLATES_RU } from './templates'

describe('musclesForExercise', () => {
  it('распознаёт базовые упражнения по-русски и по-английски', () => {
    expect(musclesForExercise('Приседания со штангой')).toEqual(['quads', 'glutes'])
    expect(musclesForExercise('Barbell squat')).toEqual(['quads', 'glutes'])
    expect(musclesForExercise('Жим штанги лёжа')).toContain('chest')
    expect(musclesForExercise('Bench press')).toContain('chest')
    expect(musclesForExercise('Подтягивания')).toEqual(['back', 'biceps'])
    expect(musclesForExercise('Планка')).toEqual(['abs'])
  })

  it('частные правила выигрывают у общих (порядок правил)', () => {
    expect(musclesForExercise('Сгибания ног лёжа')).toEqual(['hamstrings']) // не бицепс
    expect(musclesForExercise('Leg curl')).toEqual(['hamstrings'])
    expect(musclesForExercise('Жим ногами')).toEqual(['quads', 'glutes']) // не грудь
    expect(musclesForExercise('Отжимания на брусьях')).toEqual(['chest', 'triceps'])
    expect(musclesForExercise('Жим штанги стоя')).toEqual(['shoulders', 'triceps']) // не грудь
    expect(musclesForExercise('Wrist curl')).toEqual(['forearms']) // не бицепс
    expect(musclesForExercise('Становая тяга')).toContain('lower_back') // не «тяга» спины
    expect(musclesForExercise('Crunches')).toEqual(['abs']) // «run» внутри слова не бег
  })

  it('целое слово: «row» не ловится внутри других слов', () => {
    expect(musclesForExercise('Narrow grip')).toEqual([])
    expect(musclesForExercise('Cable row')).toEqual(['back', 'biceps'])
  })

  it('регистр и «ё» не важны; неизвестное — пустой список', () => {
    expect(musclesForExercise('ЖИМ ЛЁЖА')).toContain('chest')
    expect(musclesForExercise('Йога для новичков')).toEqual([])
    expect(ruleForExercise('')).toBeNull()
  })

  it('все упражнения из встроенных шаблонов привязаны к мышцам', () => {
    const names = [...WORKOUT_TEMPLATES_RU, ...WORKOUT_TEMPLATES_EN].flatMap((tpl) => tpl.days.flatMap((d) => d.exercises.map((e) => e.name)))
    const missing = names.filter((n) => musclesForExercise(n).length === 0)
    expect(missing).toEqual([])
  })
})

describe('справочник и схема тела', () => {
  it('у каждой мышцы есть хотя бы одно упражнение-подсказка и хотя бы одна зона на схеме', () => {
    const shapeMuscles = new Set([...FRONT_SHAPES, ...BACK_SHAPES].map((s) => s.muscle))
    for (const m of MUSCLE_IDS) {
      expect(referenceFor(m).length, m).toBeGreaterThan(0)
      expect(shapeMuscles.has(m), m).toBe(true)
    }
  })
  it('id правил уникальны', () => {
    const ids = EXERCISE_REFERENCE.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
