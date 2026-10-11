import { describe, expect, it } from 'vitest'
import { blankInlineForm, buildInlineEntry, canInlineAdd, entryForDate, inlineFields, planInlineSave, todaySetCount } from './inlineEntry'

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

const set = (reps: number | null, weight: number | null = null) => ({ reps, weight, time: null, duration: null, side: null })
const ent = (id: string, exercise_id: string, date: string, sets = [set(10)], notes: string | null = null) => ({ id, exercise_id, date, sets, notes })

describe('entryForDate / todaySetCount', () => {
  const entries = [ent('a', 'bench', '2026-10-10'), ent('b', 'squat', '2026-10-10', [set(5), set(5)]), ent('c', 'bench', '2026-10-09')]
  it('находит запись упражнения за дату; чужое упражнение и другая дата не мешают', () => {
    expect(entryForDate(entries, 'bench', '2026-10-10')?.id).toBe('a')
    expect(entryForDate(entries, 'bench', '2026-10-08')).toBeNull()
    expect(entryForDate(entries, 'row', '2026-10-10')).toBeNull()
  })
  it('если за дату несколько записей — берётся последняя', () => {
    expect(entryForDate([ent('x', 'bench', '2026-10-10'), ent('y', 'bench', '2026-10-10')], 'bench', '2026-10-10')?.id).toBe('y')
  })
  it('число подходов сегодня; нет записи — 0', () => {
    expect(todaySetCount(entries, 'squat', '2026-10-10')).toBe(2)
    expect(todaySetCount(entries, 'bench', '2026-10-10')).toBe(1)
    expect(todaySetCount(entries, 'row', '2026-10-10')).toBe(0)
  })
})

describe('planInlineSave', () => {
  const res = (reps: number) => ({ date: '2026-10-10', sets: [set(reps)], notes: null })
  it('записи за дату нет — создаём новую', () => {
    const p = planInlineSave([ent('c', 'bench', '2026-10-09')], 'bench', res(8))
    expect(p.kind).toBe('new')
  })
  it('запись за дату есть — дописываем подход в неё: порядок сохраняется, заметка и дата записи не теряются', () => {
    const p = planInlineSave([ent('a', 'bench', '2026-10-10', [set(10), set(9)], 'тяжело')], 'bench', res(8))
    expect(p.kind).toBe('append')
    if (p.kind !== 'append') return
    expect(p.entryId).toBe('a')
    expect(p.count).toBe(3)
    expect(p.input.sets.map((s) => s.reps)).toEqual([10, 9, 8])
    expect(p.input.notes).toBe('тяжело')
    expect(p.input.date).toBe('2026-10-10')
  })
  it('пустая существующая запись (без подходов) не считается — создаём новую', () => {
    expect(planInlineSave([ent('a', 'bench', '2026-10-10', [])], 'bench', res(8)).kind).toBe('new')
  })
  it('запись другого упражнения за ту же дату не трогаем', () => {
    expect(planInlineSave([ent('a', 'squat', '2026-10-10')], 'bench', res(8)).kind).toBe('new')
  })
})
