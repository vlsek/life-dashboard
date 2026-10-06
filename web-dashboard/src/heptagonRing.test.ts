import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { HEPTAGON_SIDES, circleGeometry, heptagonGeometry } from './lib/ringPlacement'
import ProgressRing from './components/ProgressRing.vue'

beforeEach(() => localStorage.setItem('site_lang', 'ru'))

const pts = (s: string) => s.split(' ').map((p) => p.split(',').map(Number) as [number, number])

describe('heptagonGeometry (BACKLOG 💧 2.3: кольцо недели — семиугольник)', () => {
  it('семь вершин (по числу дней недели), первая — сверху по центру', () => {
    expect(HEPTAGON_SIDES).toBe(7)
    const g = heptagonGeometry(24, 21, 0.5, 0)
    const p = pts(g.points)
    expect(p).toHaveLength(7)
    expect(p[0][0]).toBeCloseTo(24, 1)
    expect(p[0][1]).toBeCloseTo(24 - 21, 1)
  })

  it('все вершины лежат на окружности радиуса R вокруг центра', () => {
    for (const [x, y] of pts(heptagonGeometry(24, 21, 0, 0).points)) expect(Math.hypot(x - 24, y - 24)).toBeCloseTo(21, 1)
  })

  it('периметр = 7 сторон правильного семиугольника: чуть меньше длины описанной окружности', () => {
    const g = heptagonGeometry(24, 21, 0, 0)
    const side = 2 * 21 * Math.sin(Math.PI / 7)
    expect(g.perimeter).toBeCloseTo(7 * side, 6)
    expect(g.perimeter).toBeLessThan(2 * Math.PI * 21)
    expect(g.perimeter).toBeGreaterThan(0.95 * 2 * Math.PI * 21)
  })

  it('смещение штриха: 0% — весь периметр скрыт, 100% — ничего не скрыто, 50% — половина', () => {
    const g0 = heptagonGeometry(24, 21, 0, 0)
    const g50 = heptagonGeometry(24, 21, 0.5, 0)
    const g100 = heptagonGeometry(24, 21, 1, 0)
    expect(g0.offsetBase).toBeCloseTo(g0.perimeter, 6)
    expect(g50.offsetBase).toBeCloseTo(g50.perimeter / 2, 6)
    expect(g100.offsetBase).toBeCloseTo(0, 6)
  })

  it('бонус считается как у круга: доля = бонус% / 100, не больше 100%', () => {
    expect(heptagonGeometry(24, 21, 1, 20).offsetBonus).toBeCloseTo(heptagonGeometry(24, 21, 1, 0).perimeter * 0.8, 6)
    expect(heptagonGeometry(24, 21, 1, 250).offsetBonus).toBeCloseTo(0, 6)
    const c = circleGeometry(21, 1, 20)
    expect(heptagonGeometry(24, 21, 1, 20).offsetBonus / heptagonGeometry(24, 21, 1, 20).perimeter).toBeCloseTo(c.offsetBonus / c.circumference, 6)
  })
})

describe('ProgressRing: форма кольца', () => {
  const base = { basePct: 0.4, bonusPct: 0, totalPct: 40, title: 'Неделя' }

  it('по умолчанию — круг (кольцо дня не изменилось)', () => {
    const w = mount(ProgressRing, { props: base })
    expect(w.find('[data-test="progress-ring-svg"]').attributes('data-shape')).toBe('circle')
    expect(w.findAll('circle').length).toBeGreaterThanOrEqual(2)
    expect(w.find('polygon').exists()).toBe(false)
  })

  it('shape=heptagon: вместо кругов — семиугольник (дорожка + прогресс), линия толще, без поворота svg', () => {
    const w = mount(ProgressRing, { props: { ...base, shape: 'heptagon', size: 48 } })
    const svg = w.find('[data-test="progress-ring-svg"]')
    expect(svg.attributes('data-shape')).toBe('heptagon')
    expect(w.findAll('circle')).toHaveLength(0)
    expect(w.find('[data-test="hept-track"]').exists()).toBe(true)
    const base_ = w.find('[data-test="hept-base"]')
    expect(base_.attributes('stroke-width')).toBe('4.5') // у круга 3 — недельное заметно массивнее
    expect(Number(base_.attributes('stroke-dashoffset'))).toBeGreaterThan(0)
    expect(svg.attributes('style') ?? '').not.toContain('rotate')
    expect(w.find('[data-test="hept-bonus"]').exists()).toBe(false)
    expect(w.text()).toContain('40%')
  })

  it('бонусная дуга семиугольника появляется только при бонусе', () => {
    const w = mount(ProgressRing, { props: { ...base, bonusPct: 20, shape: 'heptagon' } })
    expect(w.find('[data-test="hept-bonus"]').exists()).toBe(true)
    expect(w.find('[data-test="hept-bonus"]').classes()).toContain('ring-bonus')
  })

  it('подпись под кольцом и клик работают так же', async () => {
    const w = mount(ProgressRing, { props: { ...base, shape: 'heptagon', label: 'Неделя' } })
    expect(w.text()).toContain('Неделя')
    expect(w.attributes('title')).toBe('Неделя')
  })
})

describe('ProfileSection использует семиугольник для недели', () => {
  it('исходник выбирает форму кольца недели (семиугольник / круг по настройке) и отдаёт ему дни; кольцо дня (аватар) не трогает', async () => {
    // @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в StreakFlameTheme.test.ts).
    const { readFileSync } = await import('node:fs')
    const src: string = readFileSync('src/components/ProfileSection.vue', 'utf-8')
    expect(src).toMatch(/<ProgressRing[\s\S]*?:shape="week\.shape === 'classic' \? 'circle' : 'heptagon'"[\s\S]*?:days="week\.days"[\s\S]*?\/>/)
    expect(src).not.toMatch(/<AvatarProgress[^>]*shape=/)
  })
})
