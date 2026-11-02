import { describe, expect, it } from 'vitest'
import { NOTE_MAX, cleanNote, isMissingColumn, isMood, shouldWrite } from './dayReflection'

describe('оценка и заметка дня (75.3): чистая логика', () => {
  it('оценка — только целые 1..5', () => {
    for (const m of [1, 2, 3, 4, 5]) expect(isMood(m)).toBe(true)
    for (const m of [0, 6, 2.5, '3', null, undefined]) expect(isMood(m)).toBe(false)
  })
  it('заметка: обрезка по краям и до 500 символов, пусто → null', () => {
    expect(cleanNote('  привет  ')).toBe('привет')
    expect(cleanNote('   ')).toBeNull()
    expect(cleanNote(undefined)).toBeNull()
    expect(cleanNote('я'.repeat(NOTE_MAX + 50))).toHaveLength(NOTE_MAX)
  })
  it('пустой день без прошлого — писать не нужно; снятие прежней оценки — нужно', () => {
    expect(shouldWrite(null, null, false)).toBe(false)
    expect(shouldWrite(3, null, false)).toBe(true)
    expect(shouldWrite(null, 'x', false)).toBe(true)
    expect(shouldWrite(null, null, true)).toBe(true)
  })
  it('нет колонки (миграция 114 не применена) распознаётся; обычный сбой сети — нет', () => {
    expect(isMissingColumn({ code: '42703' })).toBe(true)
    expect(isMissingColumn({ code: 'PGRST204' })).toBe(true)
    expect(isMissingColumn({ message: 'column daily_notes.mood does not exist' })).toBe(true)
    expect(isMissingColumn({ message: 'Failed to fetch' })).toBe(false)
    expect(isMissingColumn(null)).toBe(false)
  })
})
