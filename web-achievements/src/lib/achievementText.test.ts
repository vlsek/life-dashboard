import { afterEach, describe, expect, it } from 'vitest'
import { ACHIEVEMENTS, GROUP_ORDER } from './achievements'
import { achievementCondition, achievementTitle, groupTitle } from './achievementText'

afterEach(() => localStorage.removeItem('site_lang'))

describe.each(['ru', 'en'] as const)('тексты достижений (%s)', (lang) => {
  it('у каждого достижения есть название и условие, без пустых строк и «undefined»', () => {
    localStorage.setItem('site_lang', lang)
    for (const def of ACHIEVEMENTS) {
      const title = achievementTitle(def)
      const cond = achievementCondition(def)
      expect(title, def.key).toBeTruthy()
      expect(title, def.key).not.toContain('undefined')
      expect(cond, def.key).toBeTruthy()
      expect(cond, def.key).not.toContain('{n}')
      expect(cond, def.key).not.toContain('undefined')
    }
  })

  it('в условии для порога стоит именно число порога', () => {
    localStorage.setItem('site_lang', lang)
    const s30 = ACHIEVEMENTS.find((a) => a.key === 'streak_30')!
    expect(achievementCondition(s30)).toContain('30')
    const p1000 = ACHIEVEMENTS.find((a) => a.key === 'points_1000')!
    expect(achievementCondition(p1000)).toContain('1000')
  })

  it('у каждой группы есть заголовок; названия достижений не повторяются', () => {
    localStorage.setItem('site_lang', lang)
    for (const g of GROUP_ORDER) expect(groupTitle(g), g).toBeTruthy()
    const titles = ACHIEVEMENTS.map(achievementTitle)
    expect(new Set(titles).size).toBe(titles.length)
  })
})
