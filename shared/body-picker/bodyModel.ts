import { BACK_SHAPES, BODY_OUTLINE, FRONT_SHAPES, type MuscleShape } from './muscleShapes'

// Модель тела для карты мышц (BACKLOG 54.5): мужская (как была) и женская. Женская — не отдельный рисунок, а те же контуры,
// пересчитанные по профилю ширины: плечи и талия уже, бёдра шире. Так набор мышц и их `data-muscle` совпадают у обеих моделей,
// а правка контуров мужской модели автоматически попадает и в женскую. Чистая логика, без сети.
export type BodyModel = 'male' | 'female' | 'chibi' | 'leggy' | 'stocky'
export const BODY_MODELS: BodyModel[] = ['male', 'female', 'chibi', 'leggy', 'stocky']
export const isBodyModel = (v: unknown): v is BodyModel => typeof v === 'string' && (BODY_MODELS as string[]).includes(v)

// Профиль модели: (y, коэффициент ширины относительно оси x = 50), коэффициент рук и на сколько единиц руки отведены от корпуса.
interface Profile {
  width: [number, number][]
  arm: number
  spread: number
}
const PROFILES: Record<'female', Profile> = {
  // «Песочные часы» (58.2): плечи узкие, талия самая тонкая, бёдра заметно шире, руки отведены, чтобы талия была видна.
  female: {
    width: [[0, 1], [18, 1], [24, 0.84], [34, 0.8], [47, 0.8], [62, 0.72], [76, 0.6], [88, 0.95], [100, 1.34], [112, 1.3], [130, 1.14], [150, 1.04], [181, 1], [190, 1]],
    arm: 0.8,
    spread: 10,
  },
}

const widthAt = (pts: [number, number][], y: number): number => {
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

export function widthFactor(y: number, model: 'female' = 'female'): number {
  return widthAt(PROFILES[model].width, y)
}

const round = (n: number) => Math.round(n * 100) / 100

// Руки (дальше ~18–26 единиц от оси на высоте плеч–кисти) идут за плечами, а не за бёдрами: иначе кисти уезжают наружу и рука ломается.
// Переход от профиля туловища к рукам плавный (без ступеньки у подмышки).
export function factorAt(x: number, y: number, model: 'female' = 'female'): number {
  const base = widthFactor(y, model)
  if (y < 36 || y > 104) return base
  const w = Math.max(0, Math.min(1, (Math.abs(x - 50) - 18) / 8))
  return base + (PROFILES[model].arm - base) * w
}

const fmtN = (n: number) => String(round(n))
// Руки отводим от корпуса: иначе рука закрывает талию, и форма не видна (BACKLOG 58.2).
export function armSpread(x: number, y: number, model: 'female' = 'female'): number {
  if (y < 36 || y > 104) return 0
  const w = Math.max(0, Math.min(1, (Math.abs(x - 50) - 18) / 8))
  return w * Math.max(0, Math.min(1, (y - 40) / 55)) * PROFILES[model].spread * Math.sign(x - 50)
}
// ПРОПОРЦИИ (владелец 2026-10-12: «модели — просто растянутые/сжатые, хочу концептуально разные»): кроме ширины, меняем размер головы и
// вертикальные пропорции (длина туловища и ног). Голова — окружность радиуса 9·head с верхом на y = 5; точки ниже шеи (y = 23 в мужской
// модели) переносятся кусочно-линейной картой высот `ymap` [исходная y → новая y]; ноги всегда стоят на y = 181. xs — общий масштаб ширины.
interface Proportions {
  head: number
  ymap: [number, number][]
  xs: number
}
const HEAD_TOP = 5
const HEAD_R = 9
const HEAD_CY = 14
const PROPORTIONS: Record<'chibi' | 'leggy' | 'stocky', Proportions> = {
  // «Чиби»: огромная голова (почти треть роста), короткое туловище и совсем короткие ноги.
  chibi: { head: 2, ymap: [[23, 41], [36, 52], [100, 122], [181, 181]], xs: 1.08 },
  // «Длинные ноги»: маленькая голова, короткое туловище, ноги почти в 1,2 раза длиннее обычных.
  leggy: { head: 0.8, ymap: [[23, 19.4], [36, 31], [100, 86], [181, 181]], xs: 0.92 },
  // «Коренастый»: крупная голова, длинное широкое туловище, короткие крепкие ноги.
  stocky: { head: 1.2, ymap: [[23, 26.6], [36, 39.5], [100, 108], [181, 181]], xs: 1.22 },
}
const headCy = (m: Proportions): number => HEAD_TOP + HEAD_R * m.head

export interface HeadCircle {
  cx: number
  cy: number
  r: number
}
export function headOf(model: BodyModel): HeadCircle {
  if (model === 'male' || model === 'female') return { cx: 50, cy: HEAD_CY, r: HEAD_R }
  const m = PROPORTIONS[model]
  return { cx: 50, cy: round(headCy(m)), r: round(HEAD_R * m.head) }
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))
const mapY = (pts: [number, number][], y: number): number => {
  for (let i = 1; i < pts.length; i++) {
    if (y <= pts[i][0]) return pts[i - 1][1] + ((pts[i][1] - pts[i - 1][1]) * (y - pts[i - 1][0])) / (pts[i][0] - pts[i - 1][0])
  }
  return pts[pts.length - 1][1]
}
function warpProportions(x: number, y: number, m: Proportions): [number, number] {
  const cy = headCy(m)
  if (y <= 23) return [round(50 + (x - 50) * m.head), round(cy + (y - HEAD_CY) * m.head)] // голова и верх шеи — подобие вокруг центра головы
  const xs = m.head + (m.xs - m.head) * clamp01((y - 22) / 10) // шея плавно переходит от масштаба головы к масштабу тела
  return [round(50 + (x - 50) * xs), round(mapY(m.ymap, y))]
}
const warp = (x: number, y: number, model: Exclude<BodyModel, 'male'>): [number, number] =>
  model === 'female' ? [round(50 + (x - 50) * factorAt(x, y, 'female') + armSpread(x, y, 'female')), y] : warpProportions(x, y, PROPORTIONS[model])

// Путь состоит только из абсолютных команд M/L/C/Z. Прямые отрезки (L) режем на куски по ~6 единиц высоты, иначе длинный бок туловища
// переехал бы «одной линией» от плеча к бедру и талия не проявилась бы; кривые (C) пересчитываем по их точкам.
export function feminizePath(d: string, model: Exclude<BodyModel, 'male'> = 'female'): string {
  const out: string[] = []
  let cur: [number, number] | null = null
  for (const m of d.matchAll(/([MLCZ])([^MLCZ]*)/g)) {
    const cmd = m[1]
    const n = (m[2].match(/-?\d*\.?\d+/g) ?? []).map(Number)
    if (cmd === 'Z') {
      out.push('Z')
      continue
    }
    const pts: [number, number][] = []
    for (let i = 0; i + 1 < n.length; i += 2) pts.push([n[i], n[i + 1]])
    if (cmd === 'L' && cur) {
      const parts: string[] = []
      for (const [x1, y1] of pts) {
        const steps = Math.max(1, Math.ceil(Math.abs(y1 - cur[1]) / 6))
        for (let k = 1; k <= steps; k++) {
          const [wx, wy] = warp(cur[0] + ((x1 - cur[0]) * k) / steps, cur[1] + ((y1 - cur[1]) * k) / steps, model)
          parts.push(`L${fmtN(wx)} ${fmtN(wy)}`)
        }
        cur = [x1, y1]
      }
      out.push(parts.join(' '))
      continue
    }
    out.push(cmd + pts.map(([x, y]) => warp(x, y, model).map(fmtN).join(' ')).join(' '))
    if (pts.length) cur = pts[pts.length - 1]
  }
  return out.join(' ')
}

const feminizeShapes = (shapes: MuscleShape[], model: Exclude<BodyModel, 'male'>): MuscleShape[] =>
  shapes.map((s) => ({ ...s, attrs: { ...s.attrs, d: feminizePath(String(s.attrs.d), model) } }))

export const FEMALE_OUTLINE = feminizePath(BODY_OUTLINE)
export const FEMALE_FRONT_SHAPES = feminizeShapes(FRONT_SHAPES, 'female')
export const FEMALE_BACK_SHAPES = feminizeShapes(BACK_SHAPES, 'female')

export interface BodyGeometry {
  head: HeadCircle // голова: у моделей с другими пропорциями она другого размера и на другой высоте
  outline: string
  front: MuscleShape[]
  back: MuscleShape[]
}

const CACHE: Partial<Record<BodyModel, BodyGeometry>> = {}
export function bodyGeometry(model: BodyModel): BodyGeometry {
  if (model === 'male') return { head: headOf('male'), outline: BODY_OUTLINE, front: FRONT_SHAPES, back: BACK_SHAPES }
  if (model === 'female') return { head: headOf('female'), outline: FEMALE_OUTLINE, front: FEMALE_FRONT_SHAPES, back: FEMALE_BACK_SHAPES }
  return (CACHE[model] ??= { head: headOf(model), outline: feminizePath(BODY_OUTLINE, model), front: feminizeShapes(FRONT_SHAPES, model), back: feminizeShapes(BACK_SHAPES, model) })
}

// Какую модель показывать: явный выбор человека на этом устройстве главнее, потом пол из профиля, иначе мужская.
export function resolveBodyModel(stored: string | null | undefined, gender: string | null | undefined): BodyModel {
  if (isBodyModel(stored)) return stored
  return gender === 'female' ? 'female' : 'male'
}

const MODEL_KEY = 'workouts_body_model'
export function readBodyModelChoice(): BodyModel | null {
  try {
    const v = localStorage.getItem(MODEL_KEY)
    return isBodyModel(v) ? v : null
  } catch {
    return null
  }
}
// «По полу профиля» (BACKLOG 59.2): убираем явный выбор — снова решает пол из профиля
export function clearBodyModelChoice(): void {
  try {
    localStorage.removeItem(MODEL_KEY)
  } catch {
    /* выбор модели не критичен */
  }
}
export function writeBodyModelChoice(m: BodyModel): void {
  try {
    localStorage.setItem(MODEL_KEY, m)
  } catch {
    /* выбор модели не критичен */
  }
}
