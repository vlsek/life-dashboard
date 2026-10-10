import { describe, expect, it } from 'vitest'
import { blankInlineForm, buildInlineEntry, canInlineAdd, inlineFields } from './inlineEntry'

const plain = { tracks_weight: false, tracks_duration: false }
const weighted = { tracks_weight: true, tracks_duration: false }
const timed = { tracks_weight: false, tracks_duration: true }

describe('canInlineAdd', () => {
  it('обычные упражнения — встроенная строка, с левой/правой стороной — окно', () => {
    expect(canInlineAdd({ bilateral: false })).toBe(true)
    expect(canInlineAdd({ bilateral: true })).toBe(false)
  })
})

describe('inlineFields', () => {
  it('поля по свойствам упражнения', () => {
    expect(inlineFields(plain)).toEqual({ weight: false, duration: false })
    expect(inlineFields(weighted)).toEqual({ weight: true, duration: false })
    expect(inlineFields(timed)).toEqual({ weight: false, duration: true })
  })
})

describe('buildInlineEntry', () => {
  it('один подход на сегодня: повторы, вес и время; заметки нет', () => {
    const r = buildInlineEntry(weighted, { reps: 8, weight: 60, duration: null }, '2026-10-10', '09:30')
    expect(r).toEqual({ date: '2026-10-10', sets: [{ reps: 8, weight: 60, time: '09:30', duration: null, side: null }], notes: null })
  })
  it('значения из полей ввода (строки) превращаются в числа', () => {
    const r = buildInlineEntry(weighted, { reps: '10', weight: '42.5', duration: '' }, '2026-10-10', null)!
    expect(r.sets[0].reps).toBe(10)
    expect(r.sets[0].weight).toBe(42.5)
    expect(r.sets[0].time).toBeNull()
  })
  it('повторы не заданы или пусты — null (ничего не добавляем)', () => {
    expect(buildInlineEntry(plain, blankInlineForm(), '2026-10-10', '09:30')).toBeNull()
    expect(buildInlineEntry(plain, { reps: '', weight: 5, duration: null }, '2026-10-10', '09:30')).toBeNull()
  })
  it('поле, которого у упражнения нет, в запись не попадает (скрытый вес / длительность)', () => {
    const a = buildInlineEntry(plain, { reps: 15, weight: 99, duration: 77 }, '2026-10-10', null)!
    expect(a.sets[0].weight).toBeNull()
    expect(a.sets[0].duration).toBeNull()
    const b = buildInlineEntry(timed, { reps: 1, weight: 99, duration: 45 }, '2026-10-10', null)!
    expect(b.sets[0].duration).toBe(45)
    expect(b.sets[0].weight).toBeNull()
  })
  it('ноль повторов — это число, а не «пусто»', () => {
    expect(buildInlineEntry(plain, { reps: 0, weight: null, duration: null }, '2026-10-10', null)?.sets[0].reps).toBe(0)
  })
})
