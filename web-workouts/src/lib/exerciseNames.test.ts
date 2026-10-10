import { describe, expect, it } from 'vitest'
import { capFirst } from './exerciseNames'
import { VARIANT_BASES } from './exerciseVariants'
import { EXERCISE_REFERENCE } from './muscles'
import { WORKOUT_TEMPLATES_EN, WORKOUT_TEMPLATES_RU } from './templates'

describe('регистр названий упражнений (BACKLOG 54.4)', () => {
  it('capFirst: поднимает только первую строчную букву', () => {
    expect(capFirst('подтягивания')).toBe('Подтягивания')
    expect(capFirst('  жим лёжа ')).toBe('Жим лёжа')
    expect(capFirst('push-ups')).toBe('Push-ups')
    expect(capFirst('Squats')).toBe('Squats')
    expect(capFirst('3 подхода')).toBe('3 подхода')
    expect(capFirst('')).toBe('')
    expect(capFirst('ёлочка')).toBe('Ёлочка')
  })
  it('все типовые названия (разновидности-основы, справочник, шаблоны программ) начинаются с заглавной — ru и en', () => {
    const names: string[] = []
    for (const b of VARIANT_BASES) names.push(b.ru, b.en)
    for (const r of EXERCISE_REFERENCE) names.push(r.ru, r.en)
    for (const tpl of [...WORKOUT_TEMPLATES_RU, ...WORKOUT_TEMPLATES_EN]) {
      for (const d of tpl.days) for (const e of d.exercises) names.push(e.name)
      for (const w of tpl.weeks ?? []) for (const it of w.items ?? []) names.push(it.name)
    }
    expect(names.length).toBeGreaterThan(40)
    for (const n of names) expect(capFirst(n), n).toBe(n)
  })
})
