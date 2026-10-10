// @ts-ignore — в проекте нет типов node, а vitest выполняется в node; ?raw для .css в vitest отдаёт пустую строку (как в splashLoader.test.ts).
import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, computed } from 'vue'

vi.mock('./lib/useProfile', () => ({
  useProfile: () => ({
    profile: ref({ avatar_url: null, birthdate: null, goal_type: null }),
    params: ref([]),
    stats: computed(() => []),
    balance: ref(null),
    loaded: ref(true),
    error: ref(null),
    init: vi.fn(),
    uploadAvatar: vi.fn(),
    saveBirthdate: vi.fn(),
    addParam: vi.fn(),
    updateParam: vi.fn(),
    deleteParam: vi.fn(),
    refreshValues: vi.fn(),
  }),
}))

import StreakFlame from './components/StreakFlame.vue'
import ProfileSection from './components/ProfileSection.vue'
import type { StreakItem } from './lib/streaks'

const live = (w: ReturnType<typeof mount>) => w.find('[data-test="streak-flame-live"]')
const sparks = (w: ReturnType<typeof mount>) => w.findAll('[data-test="streak-spark"]')

describe('StreakFlame: «живое пламя» от 7 дней (BACKLOG 18)', () => {
  it('без days и меньше 7 дней — обычный огонёк, как раньше', () => {
    const cases: Array<{ lit: boolean; days?: number }> = [{ lit: true }, { lit: true, days: 6 }]
    for (const props of cases) {
      const w = mount(StreakFlame, { props })
      expect(live(w).exists()).toBe(false)
      expect(w.find('svg').classes()).toContain('streak-flame')
      w.unmount()
    }
  })

  it('7 дней — ступень 1: единое пламя (три слоя в одной группе), без искр', () => {
    const w = mount(StreakFlame, { props: { lit: true, days: 7 } })
    expect(live(w).exists()).toBe(true)
    expect(live(w).attributes('data-tier')).toBe('1')
    expect(w.findAll('.flame-body')).toHaveLength(1)
    for (const cls of ['layer-outer', 'layer-mid', 'layer-core']) expect(w.find(`.${cls}`).exists(), cls).toBe(true)
    expect(w.find('.tongue').exists()).toBe(false)
    expect(w.find('.streak-flame').exists()).toBe(false)
    expect(sparks(w)).toHaveLength(0)
    w.unmount()
  })

  it('30 дней — ступень 2: две искры; 100 дней — ступень 3: четыре искры', () => {
    const w30 = mount(StreakFlame, { props: { lit: true, days: 30 } })
    expect(live(w30).attributes('data-tier')).toBe('2')
    expect(sparks(w30)).toHaveLength(2)
    w30.unmount()
    const w100 = mount(StreakFlame, { props: { lit: true, days: 100 } })
    expect(live(w100).attributes('data-tier')).toBe('3')
    expect(sparks(w100)).toHaveLength(4)
    w100.unmount()
  })

  it('не засчитанный сегодня стрик остаётся тусклым контуром даже на длинной серии', () => {
    const w = mount(StreakFlame, { props: { lit: false, days: 200 } })
    expect(live(w).exists()).toBe(false)
    expect(w.find('svg').attributes('stroke-dasharray')).toBe('2.6 2.2')
    w.unmount()
  })

  it('декоративно: скрыто от скринридеров', () => {
    const w = mount(StreakFlame, { props: { lit: true, days: 50 } })
    expect(live(w).attributes('aria-hidden')).toBe('true')
    w.unmount()
  })
})

function item(over: Partial<StreakItem> = {}): StreakItem {
  return { kind: 'metric', metric: { id: 'm1', name: 'Отжимания', icon: '💪' } as any, streak: 5, todayCounted: true, ...over } as StreakItem
}

describe('ProfileSection: живое пламя у счётчика стрика на главной', () => {
  const badge = (w: ReturnType<typeof mount>) => w.find('[data-test="streak-badge"]')

  it('серия 5 дней — обычный огонёк; 7 — живое пламя', () => {
    const w5 = mount(ProfileSection, { props: { userId: 'u1', topStreak: item({ streak: 5 }) } })
    expect(badge(w5).find('[data-test="streak-flame-live"]').exists()).toBe(false)
    w5.unmount()
    const w7 = mount(ProfileSection, { props: { userId: 'u1', topStreak: item({ streak: 7 }) } })
    expect(badge(w7).find('[data-test="streak-flame-live"]').attributes('data-tier')).toBe('1')
    w7.unmount()
  })

  it('ступени по длине серии: 45 дней → 2, 120 → 3', () => {
    const w45 = mount(ProfileSection, { props: { userId: 'u1', topStreak: item({ streak: 45 }) } })
    expect(badge(w45).find('[data-test="streak-flame-live"]').attributes('data-tier')).toBe('2')
    w45.unmount()
    const w120 = mount(ProfileSection, { props: { userId: 'u1', topStreak: item({ streak: 120 }) } })
    expect(badge(w120).find('[data-test="streak-flame-live"]').attributes('data-tier')).toBe('3')
    w120.unmount()
  })

  it('недельная серия считается в днях: 1 неделя = 7 дней → живое пламя, 5 недель = 35 дней → ступень 2', () => {
    const w1 = mount(ProfileSection, { props: { userId: 'u1', topStreak: item({ streak: 1, unit: 'w' }) } })
    expect(badge(w1).find('[data-test="streak-flame-live"]').attributes('data-tier')).toBe('1')
    w1.unmount()
    const w5 = mount(ProfileSection, { props: { userId: 'u1', topStreak: item({ streak: 5, unit: 'w' }) } })
    expect(badge(w5).find('[data-test="streak-flame-live"]').attributes('data-tier')).toBe('2')
    w5.unmount()
  })

  it('длинная серия, но сегодня не засчитана — пламя не горит', () => {
    const w = mount(ProfileSection, { props: { userId: 'u1', topStreak: item({ streak: 60, todayCounted: false }) } })
    expect(badge(w).find('[data-test="streak-flame-live"]').exists()).toBe(false)
    w.unmount()
  })
})

// jsdom не вычисляет CSS — поэтому защищаем сами правила в style.css: без них «уменьшить движение» и общий выключатель
// анимаций перестали бы гасить пламя (регресс, который тестами компонента не поймать).
describe('style.css: живое пламя уважает «уменьшить движение» и выключатель анимаций', () => {
  const css: string = readFileSync('src/style.css', 'utf-8')
  it('prefers-reduced-motion гасит анимацию и искры', () => {
    const block = css.slice(css.indexOf('.streak-live {'))
    expect(/@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*\.streak-live \*[^}]*animation: none !important/.test(block)).toBe(true)
  })
  it("html[data-motion='off'] гасит анимацию пламени", () => {
    expect(css).toContain("html[data-motion='off'] .streak-live *")
  })
  it('есть три ступени свечения', () => {
    expect(css).toContain(".streak-live[data-tier='2']")
    expect(css).toContain(".streak-live[data-tier='3']")
  })
})

describe('App.vue: окно «Стрики» — живое пламя по числу дней', () => {
  it('в списке всех стриков огонёк получает :days (для недельных серий — нет)', () => {
    const app = readFileSync('src/App.vue', 'utf-8')
    expect(app).toMatch(/<StreakFlame :lit="item\.todayCounted" :days="item\.unit === 'w' \? undefined : item\.streak" \/>/)
  })
})
