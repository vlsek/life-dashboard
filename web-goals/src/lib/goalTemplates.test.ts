import { describe, expect, it } from 'vitest'
import { GOAL_TEMPLATES, TEMPLATE_GROUP_LABEL, TEMPLATE_GROUP_ORDER, templateDraft, templatesByGroup } from './goalTemplates'
import { DIFFICULTY_POINTS } from './goals'

describe('goalTemplates (76.8)', () => {
  it('id уникальны, этапы 2–30, у каждого шаблона есть ru и en название и сложность', () => {
    const ids = GOAL_TEMPLATES.map((x) => x.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const x of GOAL_TEMPLATES) {
      expect(x.stages).toBeGreaterThanOrEqual(2)
      expect(x.stages).toBeLessThanOrEqual(30)
      expect(x.ru.name.trim()).not.toBe('')
      expect(x.en.name.trim()).not.toBe('')
      expect(['easy', 'medium', 'hard']).toContain(x.difficulty)
    }
  })
  it('все группы из порядка непусты и подписаны на обоих языках', () => {
    expect(templatesByGroup().map(([g]) => g)).toEqual([...TEMPLATE_GROUP_ORDER])
    for (const g of TEMPLATE_GROUP_ORDER) {
      expect(TEMPLATE_GROUP_LABEL[g].ru).not.toBe('')
      expect(TEMPLATE_GROUP_LABEL[g].en).not.toBe('')
    }
  })
  it('черновик: название и категория на нужном языке, баллы по сложности, срока нет', () => {
    const tpl = GOAL_TEMPLATES.find((x) => x.id === 'sport_10k')!
    const ru = templateDraft(tpl, 'ru')
    expect(ru.name).toBe('Пробежать 10 км без остановки')
    expect(ru.category).toBe('Спорт')
    expect(ru.stages).toBe(6)
    expect(ru.points).toBe(DIFFICULTY_POINTS.medium)
    expect(ru.deadline).toBe('')
    expect(templateDraft(tpl, 'en').category).toBe('Sport')
  })
})
