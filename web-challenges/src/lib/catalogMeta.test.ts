import { describe, expect, it } from 'vitest'
import { challengeTemplates } from './templates'
import { setLang } from './i18n'
import { categoryCounts, daysLabel, filterByCategory, templateFacts, TEMPLATE_CATEGORIES } from './catalogMeta'

const both = () => {
  setLang('ru')
  const ru = challengeTemplates()
  setLang('en')
  const en = challengeTemplates()
  setLang('ru')
  return { ru, en }
}

describe('каталог челленджей (44.6)', () => {
  it('в обоих языках одни и те же id в том же порядке, id уникальны, шаблонов не меньше 20', () => {
    const { ru, en } = both()
    expect(ru.map((t) => t.id)).toEqual(en.map((t) => t.id))
    expect(new Set(ru.map((t) => t.id)).size).toBe(ru.length)
    expect(ru.length).toBeGreaterThanOrEqual(20)
  })
  it('у каждого шаблона категория из списка, а поля соответствуют типу', () => {
    const { ru, en } = both()
    for (const t of [...ru, ...en]) {
      expect(TEMPLATE_CATEGORIES, t.id).toContain(t.category)
      if (t.type === 'daily_fixed') expect([t.durationDays, t.dailyTarget].every((v) => (v ?? 0) > 0), t.id).toBe(true)
      if (t.type === 'daily_progressive') expect([t.durationDays, t.startValue, t.dailyIncrement].every((v) => (v ?? 0) > 0), t.id).toBe(true)
      if (t.type === 'daily_boolean') expect(t.durationDays, t.id).toBeGreaterThan(0)
      if (t.type === 'cumulative_count') expect([t.targetCount, t.itemLabel].every(Boolean), t.id).toBe(true)
    }
  })
  it('числовые параметры одинаковы в RU и EN', () => {
    const { ru, en } = both()
    const num = (t: (typeof ru)[number]) => [t.type, t.category, t.durationDays, t.dailyTarget, t.startValue, t.dailyIncrement, t.targetCount]
    expect(ru.map(num)).toEqual(en.map(num))
  })
  it('фильтр и счётчики по категориям; во всех четырёх категориях есть челленджи', () => {
    const { ru } = both()
    const counts = categoryCounts(ru)
    expect(counts.all).toBe(ru.length)
    for (const c of TEMPLATE_CATEGORIES) {
      expect(counts[c]).toBeGreaterThan(0)
      expect(filterByCategory(ru, c)).toHaveLength(counts[c])
    }
    expect(counts.sport + counts.health + counts.mind + counts.life).toBe(ru.length)
    expect(filterByCategory(ru, 'all')).toHaveLength(ru.length)
  })
  it('склонение дней и подпись цели', () => {
    expect([1, 2, 5, 11, 14, 21, 22, 30].map((n) => daysLabel(n, 'ru'))).toEqual(['1 день', '2 дня', '5 дней', '11 дней', '14 дней', '21 день', '22 дня', '30 дней'])
    expect(daysLabel(1, 'en')).toBe('1 day')
    expect(daysLabel(21, 'en')).toBe('21 days')
    const { ru } = both()
    expect(templateFacts(ru.find((t) => t.id === 'read_100_books')!, 'ru')).toBe('100 книга')
    expect(templateFacts(ru.find((t) => t.id === 'no_sugar_21')!, 'ru')).toBe('21 день')
  })
})
