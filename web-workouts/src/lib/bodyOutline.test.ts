import { describe, expect, it } from 'vitest'
// @ts-ignore — типов node в проекте нет, vitest работает в node
import { readFileSync } from 'node:fs'
import { BODY_OUTLINE } from './muscleShapes'

// BACKLOG 49.11: «шея выглядит неестественно». Контур должен начинаться и заканчиваться на окружности головы (cx 50, cy 14, r 9),
// быть зеркальным по оси x = 50 в области шеи и не замыкаться плоской линией (Z) под головой.
const nums = (s: string) => (s.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)
const first = nums(BODY_OUTLINE.split(/[A-Za-z]/).filter(Boolean)[0])
const lastSeg = nums(BODY_OUTLINE.split(/[A-Za-z]/).filter(Boolean).slice(-1)[0])
const dist = (x: number, y: number) => Math.hypot(x - 50, y - 14)

describe('контур тела: шея', () => {
  it('начало и конец лежат на окружности головы — шея растёт из головы, а не висит под ней', () => {
    expect(dist(first[0], first[1])).toBeGreaterThan(8.2)
    expect(dist(first[0], first[1])).toBeLessThan(9.8)
    expect(dist(lastSeg[0], lastSeg[1])).toBeGreaterThan(8.2)
    expect(dist(lastSeg[0], lastSeg[1])).toBeLessThan(9.8)
  })
  it('шея симметрична: начало и конец зеркальны относительно x = 50', () => {
    expect(first[0] + lastSeg[0]).toBeCloseTo(100, 5)
    expect(first[1]).toBeCloseTo(lastSeg[1], 5)
  })
  it('есть прямой участок шеи (колонка), а не сразу диагональ к плечу, и контур не замкнут', () => {
    expect(BODY_OUTLINE).toMatch(/^M[\d.]+ [\d.]+ L[\d.]+ [\d.]+ C/)
    expect(BODY_OUTLINE).not.toMatch(/Z\s*$/)
  })
  it('шея не шире головы и не уже трети её ширины', () => {
    const neckW = 100 - 2 * first[0]
    expect(neckW).toBeGreaterThan(6)
    expect(neckW).toBeLessThan(18)
  })
})

describe('мини-карта в правой плашке рисует тот же контур', () => {
  it('muscleShapes.ts в web-header — точная копия web-workouts (контуры не расходятся)', () => {
    const a: string = readFileSync('src/lib/muscleShapes.ts', 'utf-8')
    const b: string = readFileSync('../web-header/src/lib/muscleShapes.ts', 'utf-8')
    expect(b).toBe(a)
  })
  it('MuscleMiniMap использует BODY_OUTLINE, а не старую «коробку»', () => {
    const v: string = readFileSync('../web-header/src/components/MuscleMiniMap.vue', 'utf-8')
    expect(v).toContain('BODY_OUTLINE')
    expect(v).not.toContain('<rect x="36"')
  })
})
