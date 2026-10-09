import { describe, expect, it } from 'vitest'
import { WORKOUT_TEMPLATES_EN, WORKOUT_TEMPLATES_RU, workoutTemplates } from './templates'

describe('workout templates', () => {
  it('has 7 templates in each language, with matching ids', () => {
    expect(WORKOUT_TEMPLATES_RU.length).toBe(7)
    expect(WORKOUT_TEMPLATES_EN.length).toBe(7)
    expect(WORKOUT_TEMPLATES_RU.map((t) => t.id)).toEqual(WORKOUT_TEMPLATES_EN.map((t) => t.id))
  })

  it('every template has at least one day with at least one exercise', () => {
    for (const tpl of [...WORKOUT_TEMPLATES_RU, ...WORKOUT_TEMPLATES_EN]) {
      expect(tpl.days.length).toBeGreaterThan(0)
      for (const day of tpl.days) expect(day.exercises.length).toBeGreaterThan(0)
    }
  })

  it('workoutTemplates() picks EN for "en" and RU otherwise', () => {
    expect(workoutTemplates('en')).toBe(WORKOUT_TEMPLATES_EN)
    expect(workoutTemplates('ru')).toBe(WORKOUT_TEMPLATES_RU)
    expect(workoutTemplates('anything-else')).toBe(WORKOUT_TEMPLATES_RU)
  })

  it('progressive programs: weeks match across languages and week 1 is what gets saved with the exercise', () => {
    const ruWeeks = WORKOUT_TEMPLATES_RU.filter((t) => t.weeks)
    expect(ruWeeks.map((t) => t.id)).toEqual(['pushups_6w', 'pullups_6w', 'bodyweight_6w'])
    for (const ru of ruWeeks) {
      const en = WORKOUT_TEMPLATES_EN.find((t) => t.id === ru.id)!
      // Последняя (контрольная) неделя записана словами на своём языке — сравниваем количество и числовые схемы.
      expect(en.weeks!.length).toBe(ru.weeks!.length)
      const norm = (x: string) => x.replace(/ (сек|sec)/g, '')
      expect(en.weeks!.slice(0, -1).map((w) => norm(w.scheme))).toEqual(ru.weeks!.slice(0, -1).map((w) => norm(w.scheme)))
      expect(ru.weeks!.length).toBeGreaterThanOrEqual(2)
      if (!ru.weeks![0].items) expect(ru.days[0].exercises[0].scheme).toBe(ru.weeks![0].scheme)
    }
  })

  it('multi-exercise program: every week has one item per exercise, week 1 is saved with the exercises, languages match', () => {
    const ru = WORKOUT_TEMPLATES_RU.find((t) => t.id === 'bodyweight_6w')!
    const en = WORKOUT_TEMPLATES_EN.find((t) => t.id === 'bodyweight_6w')!
    const exercises = ru.days.flatMap((d) => d.exercises)
    expect(exercises.length).toBe(3)
    for (const [tpl, other] of [[ru, en], [en, ru]] as const) {
      expect(tpl.weeks!.length).toBe(6)
      for (const [i, w] of tpl.weeks!.entries()) {
        expect(w.items!.length).toBe(exercises.length)
        expect(w.items!.map((it) => it.name)).toEqual(tpl.days.flatMap((d) => d.exercises).map((e) => e.name))
        expect(w.scheme).toBe(w.items!.map((it) => it.scheme).join(' · '))
        if (i < 5) expect(w.items!.map((it) => it.scheme.replace(/ (сек|sec)$/, ''))).toEqual(other.weeks![i].items!.map((it) => it.scheme.replace(/ (сек|sec)$/, '')))
      }
      expect(tpl.days.flatMap((d) => d.exercises).map((e) => e.scheme)).toEqual(tpl.weeks![0].items!.map((it) => it.scheme))
    }
  })
})
