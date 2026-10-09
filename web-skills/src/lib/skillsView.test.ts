import { describe, expect, it } from 'vitest'
import { filterSkills, normalizeSort, sortSkills } from './skillsView'
import type { Skill } from './types'

const sk = (name: string, progress: number, created_at: string): Skill => ({ id: name, user_id: 'u', name, progress, mastered: false, step: 10, points: 10, created_at })
const list = [sk('Гитара', 40, '2026-01-02'), sk('Ёлки', 90, '2026-01-03'), sk('Шахматы', 40, '2026-01-04'), sk('Английский', 10, '2026-01-01')]

describe('skillsView', () => {
  it('поиск: без учёта регистра и ё/е, пустой запрос возвращает копию списка', () => {
    expect(filterSkills(list, 'ГИТ').map((s) => s.name)).toEqual(['Гитара'])
    expect(filterSkills(list, 'елки').map((s) => s.name)).toEqual(['Ёлки'])
    expect(filterSkills(list, '  ')).toEqual(list)
    expect(filterSkills(list, '  ')).not.toBe(list)
    expect(filterSkills(list, 'zzz')).toEqual([])
  })
  it('сортировка: новые сверху / по прогрессу (при равенстве свежие) / по алфавиту; исходный массив не меняется', () => {
    const copy = [...list]
    expect(sortSkills(list, 'new').map((s) => s.name)).toEqual(['Шахматы', 'Ёлки', 'Гитара', 'Английский'])
    expect(sortSkills(list, 'progress').map((s) => s.name)).toEqual(['Ёлки', 'Шахматы', 'Гитара', 'Английский'])
    expect(sortSkills(list, 'name').map((s) => s.name)).toEqual(['Английский', 'Гитара', 'Ёлки', 'Шахматы'])
    expect(list).toEqual(copy)
  })
  it('normalizeSort: мусор → new', () => {
    expect(normalizeSort('progress')).toBe('progress')
    expect(normalizeSort('x')).toBe('new')
    expect(normalizeSort(null)).toBe('new')
  })
})
