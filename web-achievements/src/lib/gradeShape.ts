// Форма значка достижения по грейду (общая для `GradeBadge.vue` и картинки для шаринга, BACKLOG 78.3): точки в системе 64×64, центр 32,32.
import type { Rarity } from './rewards'

// Лучи: n вершин, чередуем внешний и внутренний радиус
export function burst(n: number, rOut: number, rIn: number): string {
  const pts: string[] = []
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? rOut : rIn
    const a = (Math.PI * i) / n - Math.PI / 2
    pts.push(`${(32 + r * Math.cos(a)).toFixed(2)},${(32 + r * Math.sin(a)).toFixed(2)}`)
  }
  return pts.join(' ')
}
export const HEX = '32,3 57.1,17.5 57.1,46.5 32,61 6.9,46.5 6.9,17.5'
export const EPIC = burst(10, 31, 25)
export const LEGEND = burst(14, 31.5, 26.5)

export interface GradeShape {
  circle: boolean // тело — круг r=28
  polygon: string | null // иначе многоугольник
  innerRadius: number | null // внутреннее кольцо (необычное r=22, легендарное r=20)
}
export function gradeShape(grade: Rarity): GradeShape {
  if (grade === 'common') return { circle: true, polygon: null, innerRadius: null }
  if (grade === 'uncommon') return { circle: true, polygon: null, innerRadius: 22 }
  if (grade === 'rare') return { circle: false, polygon: HEX, innerRadius: null }
  if (grade === 'epic') return { circle: false, polygon: EPIC, innerRadius: null }
  return { circle: false, polygon: LEGEND, innerRadius: 20 }
}
