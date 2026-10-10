import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { ACHIEVEMENTS } from '../../web-achievements/src/lib/achievements'
import { HIDDEN_ACHIEVEMENTS } from '../../web-achievements/src/lib/hiddenAchievements'
import { SECTION_LADDERS, sectionFor, sectionKeys } from './lib/sectionAchievements'
import SectionAchievements from './components/SectionAchievements.vue'

describe('копия лесенок разделов (BACKLOG 49.6)', () => {
  it('каждая ступень существует в реестре web-achievements с тем же порогом и группой', () => {
    for (const [section, ladders] of Object.entries(SECTION_LADDERS)) {
      for (const l of ladders) {
        for (const st of l.steps) {
          const def = ACHIEVEMENTS.find((a) => a.key === st.key)
          expect(def, `${section}: ${st.key}`).toBeTruthy()
          expect(def!.target).toBe(st.target)
          if (!st.key.startsWith('first_')) expect(def!.group).toBe(l.group)
        }
      }
    }
  })
  it('лесенка раздела полная: все достижения группы реестра попали в блок', () => {
    for (const ladders of Object.values(SECTION_LADDERS)) {
      for (const l of ladders) {
        const inRegistry = ACHIEVEMENTS.filter((a) => a.group === l.group).map((a) => a.key)
        for (const k of inRegistry) expect(l.steps.map((s) => s.key), l.group).toContain(k)
      }
    }
  })
  it('скрытых достижений в блоках нет', () => {
    const hidden = new Set(HIDDEN_ACHIEVEMENTS.map((d) => d.key))
    for (const sec of Object.keys(SECTION_LADDERS)) for (const k of sectionKeys(sec)) expect(hidden.has(k)).toBe(false)
  })
  it('раздел по адресу страницы', () => {
    expect(sectionFor('/goals/')).toBe('goals')
    expect(sectionFor('/skills.html')).toBe('skills')
    expect(sectionFor('/languages/index.html')).toBe('languages')
    expect(sectionFor('/shop/')).toBeNull()
    expect(sectionFor('/dashboard/')).toBe('dashboard')
    expect(sectionFor('/account/')).toBeNull()
  })
})

describe('SectionAchievements', () => {
  it('свёрнут по умолчанию; по нажатию показывает ступени, полученные отмечены', async () => {
    localStorage.setItem('site_lang', 'ru')
    const w = mount(SectionAchievements, { props: { section: 'goals', unlocked: new Set(['first_goal']) } })
    expect(w.find('[data-test="secach-body"]').exists()).toBe(false)
    expect(w.get('[data-test="secach-count"]').text()).toBe('1 / 4')
    await w.get('[data-test="secach-toggle"]').trigger('click')
    const steps = w.findAll('[data-test="secach-step"]')
    expect(steps).toHaveLength(4)
    expect(steps[0].classes()).toContain('gh-secach-done')
    expect(steps[1].classes()).not.toContain('gh-secach-done')
    expect(steps[1].text()).toContain('Выполнено целей: 10')
    expect(w.get('a').attributes('href')).toBe('/achievements/')
  })
})

describe('Дашборд (49.6 срез 2)', () => {
  it('блок содержит серии, идеальные дни, баллы и мега-неделю; у каждой группы есть тексты ru/en', async () => {
    localStorage.setItem('site_lang', 'ru')
    expect(SECTION_LADDERS.dashboard.map((l) => l.group)).toEqual(['streak', 'perfect', 'points', 'weeks'])
    const w = mount(SectionAchievements, { props: { section: 'dashboard', unlocked: new Set(['streak_5', 'points_100']) } })
    expect(w.get('[data-test="secach-count"]').text()).toBe('2 / 12')
    await w.get('[data-test="secach-toggle"]').trigger('click')
    expect(w.text()).toContain('Лучшая серия: 30 дн.')
    expect(w.text()).toContain('Закончить неделю больше чем на 100%')
  })
})
