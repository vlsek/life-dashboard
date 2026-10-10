import { BACK_SHAPES, BODY_OUTLINE, FRONT_SHAPES, type MuscleShape } from './muscleShapes'

// Модель тела для карты мышц (BACKLOG 54.5): мужская (как была) и женская. Женская — не отдельный рисунок, а те же контуры,
// пересчитанные по профилю ширины: плечи и талия уже, бёдра шире. Так набор мышц и их `data-muscle` совпадают у обеих моделей,
// а правка контуров мужской модели автоматически попадает и в женскую. Чистая логика, без сети.
export type BodyModel = 'male' | 'female'

// (y, коэффициент ширины относительно оси x = 50): шея и голова без изменений, плечи 0.9, талия 0.85, бёдра 1.14, ступни 1.
const WIDTH_PROFILE: [number, number][] = [
  [0, 1],
  [30, 1],
  [36, 0.9],
  [47, 0.9],
  [75, 0.85],
  [88, 0.92],
  [100, 1.14],
  [118, 1.1],
  [150, 1.04],
  [181, 1],
  [190, 1],
]

export function widthFactor(y: number): number {
  const pts = WIDTH_PROFILE
  if (y <= pts[0][0]) return pts[0][1]
  for (let i = 1; i < pts.length; i++) {
    if (y <= pts[i][0]) {
      const [y0, f0] = pts[i - 1]
      const [y1, f1] = pts[i]
      return f0 + ((f1 - f0) * (y - y0)) / (y1 - y0)
    }
  }
  return pts[pts.length - 1][1]
}

const round = (n: number) => Math.round(n * 100) / 100

// Путь состоит только из абсолютных команд M/L/C/Z — пересчитываем каждую пару (x, y).
export function feminizePath(d: string): string {
  return d.replace(/(-?\d*\.?\d+)\s+(-?\d*\.?\d+)/g, (_, xs: string, ys: string) => {
    const x = Number(xs)
    const y = Number(ys)
    return `${round(50 + (x - 50) * widthFactor(y))} ${y}`
  })
}

const feminizeShapes = (shapes: MuscleShape[]): MuscleShape[] =>
  shapes.map((s) => ({ ...s, attrs: { ...s.attrs, d: feminizePath(String(s.attrs.d)) } }))

export const FEMALE_OUTLINE = feminizePath(BODY_OUTLINE)
export const FEMALE_FRONT_SHAPES = feminizeShapes(FRONT_SHAPES)
export const FEMALE_BACK_SHAPES = feminizeShapes(BACK_SHAPES)

export interface BodyGeometry {
  outline: string
  front: MuscleShape[]
  back: MuscleShape[]
}

export function bodyGeometry(model: BodyModel): BodyGeometry {
  return model === 'female'
    ? { outline: FEMALE_OUTLINE, front: FEMALE_FRONT_SHAPES, back: FEMALE_BACK_SHAPES }
    : { outline: BODY_OUTLINE, front: FRONT_SHAPES, back: BACK_SHAPES }
}

// Какую модель показывать: явный выбор человека на этом устройстве главнее, потом пол из профиля, иначе мужская.
export function resolveBodyModel(stored: string | null | undefined, gender: string | null | undefined): BodyModel {
  if (stored === 'male' || stored === 'female') return stored
  return gender === 'female' ? 'female' : 'male'
}

const MODEL_KEY = 'workouts_body_model'
export function readBodyModelChoice(): BodyModel | null {
  try {
    const v = localStorage.getItem(MODEL_KEY)
    return v === 'male' || v === 'female' ? v : null
  } catch {
    return null
  }
}
export function writeBodyModelChoice(m: BodyModel): void {
  try {
    localStorage.setItem(MODEL_KEY, m)
  } catch {
    /* выбор модели не критичен */
  }
}
