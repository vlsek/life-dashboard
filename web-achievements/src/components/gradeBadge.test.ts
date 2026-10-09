import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в других стражах пилота).
import { readFileSync } from 'node:fs'
import GradeBadge from './GradeBadge.vue'
import AchievementCard from './AchievementCard.vue'
import AchievementUnlockedModal from './AchievementUnlockedModal.vue'
import { ACHIEVEMENTS, evaluate, type Counters } from '../lib/achievements'
import { GRADE, ICON_BY_KEY, gradeOf } from '../lib/grade'
import { ICON_PATHS } from '../lib/icons'
import { RARITIES, RARITY_COLOR } from '../lib/rewards'
import i18nRaw from '../lib/i18n.ts?raw'

// BACKLOG 44.12 (срез 1): у каждого достижения свой грейд и своя иконка; значок — форма по грейду.
const zero = Object.fromEntries(['streakBest', 'perfectDays', 'pointsTotal', 'metricDone', 'weightEntries', 'goalsDone', 'skillsMastered', 'booksDone', 'workoutDays', 'challengesDone', 'megaWeeks', 'wordsAdded', 'wordsLearned', 'milestonesDone'].map((k) => [k, 0])) as Counters
const stateOf = (key: string) => evaluate(zero).find((s) => s.def.key === key)!

beforeEach(() => localStorage.setItem('site_lang', 'ru'))

describe('таблицы грейдов и иконок (страж)', () => {
  const keys = ACHIEVEMENTS.map((a) => a.key)
  it('у каждого достижения есть грейд и иконка, и нет записей про несуществующие', () => {
    expect(keys.filter((k) => !(k in GRADE))).toEqual([])
    expect(keys.filter((k) => !(k in ICON_BY_KEY))).toEqual([])
    expect(Object.keys(GRADE).filter((k) => !keys.includes(k))).toEqual([])
    expect(Object.keys(ICON_BY_KEY).filter((k) => !keys.includes(k))).toEqual([])
  })
  it('грейды допустимые; у каждого уровня есть подпись RU и EN; присутствуют все пять', () => {
    const known = new Set<string>(RARITIES)
    for (const k of keys) expect(known.has(gradeOf(k)), k).toBe(true)
    for (const r of RARITIES) {
      expect([...i18nRaw.matchAll(new RegExp('ach_grade_' + r + ':', 'g'))].length, r).toBe(2)
      expect(keys.some((k) => gradeOf(k) === r), 'нет достижений грейда ' + r).toBe(true)
    }
  })
  it('иконки существуют в библиотеке, внутри одной группы все разные', () => {
    for (const a of ACHIEVEMENTS) expect(a.icon in ICON_PATHS, a.key + ' → ' + a.icon).toBe(true)
    const byGroup = new Map<string, string[]>()
    for (const a of ACHIEVEMENTS) byGroup.set(a.group, [...(byGroup.get(a.group) || []), a.icon])
    for (const [g, icons] of byGroup) expect(new Set(icons).size, 'повторы иконок в группе ' + g + ': ' + icons.join(',')).toBe(icons.length)
  })
  it('реестр отдаёт иконку из таблицы', () => {
    for (const a of ACHIEVEMENTS) expect(a.icon, a.key).toBe(ICON_BY_KEY[a.key])
  })
  it('грейд внутри группы не убывает с порогом; вершины лесенок — не ниже эпического (кроме серий и баллов с «легендарными»)', () => {
    const order = RARITIES as readonly string[]
    const groups = new Map<string, typeof ACHIEVEMENTS[number][]>()
    for (const a of ACHIEVEMENTS) groups.set(a.group, [...(groups.get(a.group) || []), a])
    for (const [g, list] of groups) {
      const sorted = [...list].sort((x, y) => x.target - y.target)
      for (let i = 1; i < sorted.length; i++) expect(order.indexOf(gradeOf(sorted[i].key)), `${g}: ${sorted[i].key} не ниже ${sorted[i - 1].key}`).toBeGreaterThanOrEqual(order.indexOf(gradeOf(sorted[i - 1].key)))
    }
    for (const k of ['words_100', 'learned_100', 'goals_50', 'skills_25', 'books_25', 'challenges_25', 'milestones_25']) expect(['epic', 'legendary'], k).toContain(gradeOf(k))
    for (const k of ['streak_100', 'perfect_days_100', 'points_1000', 'workouts_250']) expect(gradeOf(k), k).toBe('legendary')
  })
  it('самые лёгкие «первые шаги» — обычные', () => {
    for (const k of keys.filter((x) => x.startsWith('first_'))) expect(gradeOf(k), k).toBe('common')
  })
})

describe('GradeBadge: форма по грейду', () => {
  const shape = (grade: string, unlocked = true) => {
    const w = mount(GradeBadge, { props: { grade: grade as never, icon: 'flame', unlocked } })
    return { w, circles: w.findAll('svg.gb-shape circle').length, polys: w.findAll('svg.gb-shape polygon').length }
  }
  it('обычное — круг; необычное — круг и внутреннее кольцо; редкое — шестиугольник; эпическое — звезда; легендарное — солнце и кольцо', () => {
    expect(shape('common')).toMatchObject({ circles: 1, polys: 0 })
    expect(shape('uncommon')).toMatchObject({ circles: 2, polys: 0 })
    const rare = shape('rare')
    expect(rare).toMatchObject({ circles: 0, polys: 1 })
    expect(rare.w.find('polygon').attributes('points')!.split(' ').length).toBe(6)
    const epic = shape('epic')
    expect(epic).toMatchObject({ circles: 0, polys: 1 })
    expect(epic.w.find('polygon').attributes('points')!.split(' ').length).toBe(20)
    const leg = shape('legendary')
    expect(leg).toMatchObject({ circles: 1, polys: 1 })
    expect(leg.w.find('polygon').attributes('points')!.split(' ').length).toBe(28)
  })
  it('все пять форм различны', () => {
    const sig = RARITIES.map((g) => shape(g).w.find('svg.gb-shape').html())
    expect(new Set(sig).size).toBe(5)
  })
  it('открытое — цвет грейда и состояние on; закрытое — off, без цвета', () => {
    const on = mount(GradeBadge, { props: { grade: 'epic', icon: 'trophy', unlocked: true } })
    expect(on.attributes('data-state')).toBe('on')
    expect(on.attributes('style')).toContain(RARITY_COLOR.epic.toLowerCase())
    const off = mount(GradeBadge, { props: { grade: 'epic', icon: 'trophy', unlocked: false } })
    expect(off.attributes('data-state')).toBe('off')
    expect(off.classes()).toContain('is-off')
  })
  it('внутри иконка (svg), размер задаётся', () => {
    const w = mount(GradeBadge, { props: { grade: 'rare', icon: 'compass', unlocked: true, size: 96 } })
    expect(w.findAll('svg').length).toBe(2)
    expect(w.attributes('style')).toContain('width: 96px')
  })
  it('пульс свечения только у открытого легендарного; в «уменьшить движение» гасится; цвет не из акцента темы', () => {
    const src: string = readFileSync('src/components/GradeBadge.vue', 'utf-8')
    expect(src).toMatch(/\.is-on\.g-legendary\s*\{[^}]*animation:\s*gb-glow/)
    expect(src).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.grade-badge\s*\{\s*animation:\s*none/)
    expect(src).not.toContain('var(--accent)')
  })
})

describe('карточка и окно поздравления показывают грейд', () => {
  const card = (key: string, unlocked: boolean) => mount(AchievementCard, { props: { state: stateOf(key), unlocked, unlockedAt: null } })
  it('у КАЖДОЙ карточки есть грейд-метка и значок нужной формы (даже без награды)', () => {
    for (const a of ACHIEVEMENTS) {
      const w = card(a.key, false)
      expect(w.find('[data-testid="achievement-grade"]').attributes('data-grade'), a.key).toBe(gradeOf(a.key))
      expect(w.find('.grade-badge').attributes('data-grade'), a.key).toBe(gradeOf(a.key))
    }
  })
  it('подпись грейда RU/EN: «Эпическое» / Epic; у значка без награды «Обычное»', () => {
    expect(card('words_100', true).find('[data-testid="achievement-grade"]').text()).toBe('Эпическое')
    expect(card('first_goal', false).find('[data-testid="achievement-grade"]').text()).toBe('Обычное')
    localStorage.setItem('site_lang', 'en')
    expect(card('streak_100', true).find('[data-testid="achievement-grade"]').text()).toBe('Legendary')
  })
  it('открытая эпическая и легендарная карточки светятся, обычная — нет; цвет рамки — цвет грейда', () => {
    expect(card('words_100', true).find('[data-testid="achievement-card"]').attributes('style')).toContain('color-mix')
    expect(card('streak_100', true).find('[data-testid="achievement-card"]').attributes('style')).toContain(RARITY_COLOR.legendary.toLowerCase())
    expect(card('first_goal', true).find('[data-testid="achievement-card"]').attributes('style')).not.toContain('color-mix')
    // закрытая не светится
    expect(card('streak_100', false).find('[data-testid="achievement-card"]').attributes('style')).not.toContain('color-mix')
  })
  it('окно поздравления: значок формы грейда и строка с грейдом', () => {
    const w = mount(AchievementUnlockedModal, { props: { states: [stateOf('streak_100')] } })
    expect(w.find('[data-testid="unlocked-badge"] .grade-badge').attributes('data-grade')).toBe('legendary')
    expect(w.find('[data-testid="unlocked-grade"]').text()).toBe('Легендарное')
    expect(w.find('[data-testid="unlocked-grade"]').attributes('style')).toContain(RARITY_COLOR.legendary.toLowerCase())
  })
})
