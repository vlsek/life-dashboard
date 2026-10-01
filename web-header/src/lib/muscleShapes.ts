import type { MuscleId } from './muscles'

// Схематичная 2D-фигура (не анатомический атлас): каждая зона — простая фигура в viewBox 0 0 100 190.
// Левая/правая стороны — отдельные фигуры одной и той же мышцы.
export interface MuscleShape {
  muscle: MuscleId
  tag: 'rect' | 'ellipse' | 'polygon'
  attrs: Record<string, number | string>
}

const r = (muscle: MuscleId, x: number, y: number, w: number, h: number, rx: number): MuscleShape => ({ muscle, tag: 'rect', attrs: { x, y, width: w, height: h, rx } })
const e = (muscle: MuscleId, cx: number, cy: number, rx: number, ry: number): MuscleShape => ({ muscle, tag: 'ellipse', attrs: { cx, cy, rx, ry } })

const shoulders = [e('shoulders', 31, 44, 8, 6.5), e('shoulders', 69, 44, 8, 6.5)]
const forearms = [r('forearms', 18.5, 73, 6.5, 22, 3), r('forearms', 75, 73, 6.5, 22, 3)]
const calves = [r('calves', 35, 142, 11, 36, 5), r('calves', 54, 142, 11, 36, 5)]

export const FRONT_SHAPES: MuscleShape[] = [
  ...shoulders,
  r('chest', 38, 38, 11.5, 15, 4),
  r('chest', 50.5, 38, 11.5, 15, 4),
  r('biceps', 21, 51, 7, 20, 3.5),
  r('biceps', 72, 51, 7, 20, 3.5),
  ...forearms,
  r('abs', 41, 55, 18, 34, 5),
  r('quads', 34, 95, 14, 42, 6),
  r('quads', 52, 95, 14, 42, 6),
  ...calves,
]

export const BACK_SHAPES: MuscleShape[] = [
  ...shoulders,
  { muscle: 'back', tag: 'polygon', attrs: { points: '38,36 62,36 66,58 60,76 40,76 34,58' } },
  r('triceps', 21, 51, 7, 20, 3.5),
  r('triceps', 72, 51, 7, 20, 3.5),
  ...forearms,
  r('lower_back', 41, 77, 18, 13, 4),
  e('glutes', 42.5, 99, 7.5, 8),
  e('glutes', 57.5, 99, 7.5, 8),
  r('hamstrings', 34, 110, 14, 30, 6),
  r('hamstrings', 52, 110, 14, 30, 6),
  ...calves,
]
