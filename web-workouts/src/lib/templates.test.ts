import { describe, expect, it } from 'vitest'
import { WORKOUT_TEMPLATES_EN, WORKOUT_TEMPLATES_RU, workoutTemplates } from './templates'

describe('workout templates', () => {
  it('has 4 templates in each language, with matching ids', () => {
    expect(WORKOUT_TEMPLATES_RU.length).toBe(4)
    expect(WORKOUT_TEMPLATES_EN.length).toBe(4)
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
})
