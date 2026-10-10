import { describe, expect, it } from 'vitest'
import { MILESTONE_TEMPLATES, TEMPLATE_CATEGORY_LABEL, TEMPLATE_CATEGORY_ORDER, templateDraft, templatesByCategory } from './milestoneTemplates'
import { ALL_TAB, buildCategoryTabs, resolveCategory } from './categoryTabs'
import type { Milestone } from './types'

describe('шаблоны вех (BACKLOG 44.9)', () => {
  it('идентификаторы уникальны, в каждой категории есть шаблоны, у всех есть ru/en названия и положительный интервал', () => {
    expect(new Set(MILESTONE_TEMPLATES.map((t) => t.id)).size).toBe(MILESTONE_TEMPLATES.length)
    for (const [cat, list] of templatesByCategory()) {
      expect(list.length, cat).toBeGreaterThan(0)
      expect(TEMPLATE_CATEGORY_LABEL[cat].ru).not.toBe('')
    }
    expect(templatesByCategory().map(([c]) => c)).toEqual([...TEMPLATE_CATEGORY_ORDER])
    for (const t of MILESTONE_TEMPLATES) {
      expect(t.ru.name, t.id).not.toBe('')
      expect(t.en.name, t.id).not.toBe('')
      expect(t.value, t.id).toBeGreaterThan(0)
    }
  })
  it('у каждого медицинского шаблона заметка-оговорка «ориентир / уточните у врача» (ru и en)', () => {
    for (const t of MILESTONE_TEMPLATES.filter((x) => x.category === 'health')) {
      expect(t.ru.note, t.id).toMatch(/Ориентир, уточните у врача/)
      expect(t.en.note, t.id).toMatch(/rough guide — ask your/i)
    }
  })
  it('заготовка формы: название, группа и интервал на языке интерфейса; пробег у машины', () => {
    const oil = MILESTONE_TEMPLATES.find((t) => t.id === 'car_oil')!
    expect(templateDraft(oil, 'ru')).toMatchObject({ name: oil.ru.name, category: 'Машина', interval_value: 12, interval_unit: 'month', interval_km: 10000 })
    expect(templateDraft(oil, 'en')).toMatchObject({ name: oil.en.name, category: 'Car' })
    const meters = MILESTONE_TEMPLATES.find((t) => t.id === 'home_meters')!
    expect(templateDraft(meters, 'ru').interval_km).toBe(0)
  })
})

const m = (id: string, category: string): Milestone => ({ id, user_id: 'u', name: id, category, last_date: null, interval_value: null, interval_unit: null, due_date: null, last_km: null, interval_km: null, note: null, history: [], done: false, created_at: '' })

describe('вкладки-категории', () => {
  it('«Все» + по группе по алфавиту со счётчиками; пустая категория → «Прочее»', () => {
    const tabs = buildCategoryTabs([m('a', 'Машина'), m('b', 'Здоровье'), m('c', 'Машина'), m('d', '')], 'Прочее', 'Все')
    expect(tabs.map((t) => `${t.key}:${t.count}`)).toEqual([`${ALL_TAB}:4`, 'Здоровье:1', 'Машина:2', 'Прочее:1'])
  })
  it('выбранной вкладки больше нет → «Все»', () => {
    const tabs = buildCategoryTabs([m('a', 'Машина')], 'Прочее', 'Все')
    expect(resolveCategory('Машина', tabs)).toBe('Машина')
    expect(resolveCategory('Дом', tabs)).toBe(ALL_TAB)
  })
})
