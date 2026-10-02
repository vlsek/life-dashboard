import { describe, it, expect } from 'vitest'
import { skillPercent, bar, suggestionsFor, buildSkillRow } from './skills'

describe('bar', () => {
  it('renders filled/empty blocks proportionally, width 16 by default', () => {
    expect(bar(0)).toBe('░'.repeat(16))
    expect(bar(50)).toBe('█'.repeat(8) + '░'.repeat(8))
    expect(bar(100)).toBe('█'.repeat(16))
  })

  it('respects a custom width', () => {
    expect(bar(25, 4)).toBe('█░░░')
  })
})

describe('suggestionsFor', () => {
  it('returns the RU list untouched when nothing is added yet', () => {
    const list = suggestionsFor('ru', new Set())
    expect(list.length).toBe(10)
    expect(list[0]).toEqual({ name: 'Продольный шпагат', icon: '🤸' })
  })

  it('filters out suggestions already present by exact name', () => {
    const list = suggestionsFor('en', new Set(['Front split', 'Side split']))
    expect(list.find((s) => s.name === 'Front split')).toBeUndefined()
    expect(list.length).toBe(8)
  })

  it('EN and RU lists are independent (same length, different names)', () => {
    expect(suggestionsFor('en', new Set()).length).toBe(suggestionsFor('ru', new Set()).length)
    expect(suggestionsFor('en', new Set())[0].name).not.toBe(suggestionsFor('ru', new Set())[0].name)
  })
})

describe('buildSkillRow', () => {
  it('trims the name and defaults step/points to 10 when falsy', () => {
    expect(buildSkillRow({ name: '  Whistle  ', step: 0, points: 0 })).toEqual({
      name: 'Whistle',
      step: 10,
      points: 10,
    })
  })

  it('keeps explicit non-zero values', () => {
    expect(buildSkillRow({ name: 'X', step: 5, points: 20 })).toEqual({ name: 'X', step: 5, points: 20 })
  })
})

// BACKLOG 22 (11:58): прогресс-бар навыка
describe('skillPercent', () => {
  it('rounds to a whole percent', () => {
    expect(skillPercent(0)).toBe(0)
    expect(skillPercent(33.4)).toBe(33)
    expect(skillPercent(66.5)).toBe(67)
    expect(skillPercent(100)).toBe(100)
  })
  it('clamps into 0..100', () => {
    expect(skillPercent(-20)).toBe(0)
    expect(skillPercent(140)).toBe(100)
  })
  it('treats empty and garbage as 0', () => {
    expect(skillPercent(null)).toBe(0)
    expect(skillPercent(undefined)).toBe(0)
    expect(skillPercent(NaN)).toBe(0)
    expect(skillPercent(Infinity)).toBe(0)
  })
})
