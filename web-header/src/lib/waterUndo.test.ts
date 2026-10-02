import { beforeEach, describe, expect, it } from 'vitest'
import { MAX_DAY_ML, UNDO_KEEP_DAYS, UNDO_LIMIT, canUndo, loadStacks, parseStack, parseTotalInput, pushEntry, saveStack, undoKey } from './waterUndo'

beforeEach(() => localStorage.clear())

describe('pushEntry / canUndo', () => {
  it('добавляет шаг, не пишет «ничего не изменилось», держит не больше UNDO_LIMIT', () => {
    expect(pushEntry([], 0, 200)).toEqual([{ prev: 0, next: 200 }])
    const same = [{ prev: 0, next: 200 }]
    expect(pushEntry(same, 200, 200)).toBe(same)
    let st: { prev: number; next: number }[] = []
    for (let i = 0; i < UNDO_LIMIT + 5; i++) st = pushEntry(st, i * 100, i * 100 + 100)
    expect(st.length).toBe(UNDO_LIMIT)
    expect(st[st.length - 1]).toEqual({ prev: (UNDO_LIMIT + 4) * 100, next: (UNDO_LIMIT + 5) * 100 })
  })
  it('отмена доступна только пока значение дня равно последнему записанному', () => {
    const st = [{ prev: 500, next: 700 }]
    expect(canUndo(st, 700)).toBe(true)
    expect(canUndo(st, 900)).toBe(false) // значение успели изменить в другом месте
    expect(canUndo([], 0)).toBe(false)
    expect(canUndo(undefined, 0)).toBe(false)
  })
})

describe('parseStack', () => {
  it('мусор, чужой формат и невалидные шаги → пусто / отбрасываются', () => {
    expect(parseStack(null)).toEqual([])
    expect(parseStack('not json')).toEqual([])
    expect(parseStack('{"a":1}')).toEqual([])
    expect(parseStack(JSON.stringify([{ prev: 1, next: 2 }, { prev: -5, next: 2 }, { prev: 'x', next: 1 }, null]))).toEqual([{ prev: 1, next: 2 }])
  })
})

describe('parseTotalInput', () => {
  it('целое число мл 0…MAX; пробелы и запятая допустимы; остальное — null', () => {
    expect(parseTotalInput('1500')).toBe(1500)
    expect(parseTotalInput(' 1 500 ')).toBe(1500)
    expect(parseTotalInput('1500,6')).toBe(1501)
    expect(parseTotalInput(0)).toBe(0)
    expect(parseTotalInput(String(MAX_DAY_ML))).toBe(MAX_DAY_ML)
    expect(parseTotalInput(String(MAX_DAY_ML + 1))).toBeNull()
    expect(parseTotalInput('-5')).toBeNull()
    expect(parseTotalInput('abc')).toBeNull()
    expect(parseTotalInput('')).toBeNull()
    expect(parseTotalInput(null)).toBeNull()
    expect(parseTotalInput(undefined)).toBeNull()
  })
})

describe('localStorage', () => {
  it('saveStack пишет и удаляет пустой стек; loadStacks читает только свои дни и чистит старые', () => {
    const today = '2026-10-10'
    saveStack('u1', today, [{ prev: 0, next: 300 }])
    saveStack('u1', '2026-10-09', [{ prev: 100, next: 400 }])
    saveStack('u2', today, [{ prev: 0, next: 999 }]) // чужой пользователь
    localStorage.setItem(undoKey('u1', '2026-09-01'), JSON.stringify([{ prev: 0, next: 1 }])) // старше UNDO_KEEP_DAYS
    const loaded = loadStacks('u1', today)
    expect(Object.keys(loaded).sort()).toEqual(['2026-10-09', '2026-10-10'])
    expect(localStorage.getItem(undoKey('u1', '2026-09-01'))).toBeNull()
    expect(localStorage.getItem(undoKey('u2', today))).not.toBeNull()
    saveStack('u1', today, [])
    expect(localStorage.getItem(undoKey('u1', today))).toBeNull()
    expect(UNDO_KEEP_DAYS).toBeGreaterThan(0)
  })
})
