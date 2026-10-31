import { describe, it, expect } from 'vitest'
import { normalizeCategory, categoryOptions, matchCategory, groupByCategory } from './skillsView'
import { buildSkillRow } from './skills'
import type { Skill } from './types'
import formSrc from '../components/SkillForm.vue?raw'
import appSrc from '../App.vue?raw'
import dictSrc from './i18n.ts?raw'

const sk = (id: string, category: string | null | undefined): Skill => ({ id, user_id: 'u', name: id, progress: 0, mastered: false, step: 10, points: 10, category, created_at: '2026-01-01' })

describe('категории навыков (44.4 срез 2)', () => {
  it('normalizeCategory: пробелы, длина 40, пусто → null', () => {
    expect(normalizeCategory('  а   б ')).toBe('а б')
    expect(normalizeCategory('   ')).toBeNull()
    expect(normalizeCategory(undefined)).toBeNull()
    expect(normalizeCategory('x'.repeat(60))).toHaveLength(40)
  })
  it('categoryOptions: уникальные без учёта регистра, по алфавиту', () => {
    expect(categoryOptions([sk('a', 'Спорт'), sk('b', 'спорт'), sk('c', 'Музыка'), sk('d', null), sk('e', ' ')])).toEqual(['Музыка', 'Спорт'])
  })
  it('matchCategory: совпавшее берёт написание из списка, пусто → null, новое как есть', () => {
    expect(matchCategory(' спорт', ['Спорт'])).toBe('Спорт')
    expect(matchCategory('', ['Спорт'])).toBeNull()
    expect(matchCategory('Йога', ['Спорт'])).toBe('Йога')
  })
  it('groupByCategory: алфавит, «без категории» последней, порядок внутри сохранён; без категорий — одна группа null', () => {
    const flat = groupByCategory([sk('a', null), sk('b', '')])
    expect(flat).toHaveLength(1)
    expect(flat[0].category).toBeNull()
    const g = groupByCategory([sk('a', null), sk('b', 'Яз'), sk('c', 'Муз'), sk('d', 'яз')])
    expect(g.map((x) => x.category)).toEqual(['Муз', 'Яз', null])
    expect(g[1].skills.map((x) => x.id)).toEqual(['b', 'd'])
    expect(groupByCategory([])).toEqual([])
  })
  it('buildSkillRow: категория только при колонке', () => {
    expect(buildSkillRow({ name: 'X', step: 5, points: 20, category: 'Спорт' })).toEqual({ name: 'X', step: 5, points: 20 })
    expect(buildSkillRow({ name: 'X', step: 5, points: 20, category: ' Спорт ' }, { categoryColumn: true }).category).toBe('Спорт')
    expect(buildSkillRow({ name: 'X', step: 5, points: 20, category: '' }, { categoryColumn: true }).category).toBeNull()
  })
  it('проводка: поле в форме только при колонке; словари на двух языках', () => {
    expect(formSrc).toContain('v-if="categoryEnabled"')
    expect(appSrc).toContain('ActiveSkillsList')
    expect(dictSrc.split('skills_field_category:').length - 1).toBe(2)
    expect(dictSrc.split('skills_no_category:').length - 1).toBe(2)
  })
})
