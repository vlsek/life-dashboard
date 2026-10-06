import type { DayPlace, WeekPlace } from './progressSettings'
import type { WeekDaySegment } from './progress'

// Портировано из renderDayProgressRing()/renderWeekProgress()/renderHeader*Badge() в dashboard.js —
// только чистая логика: где показывать кольцо и какие у него размеры.

export interface RingData {
  basePct: number // 0..1
  bonusPct: number
  totalPct: number
  title: string
  shape?: 'heptagon' | 'classic' // только у недели: вид из настроек
  days?: WeekDaySegment[] | null // только у недели: прогресс каждого из 7 дней (сторона семиугольника = день)
}

// Куда рисовать кольцо дня: вокруг аватарки, бейджем в шапке или нигде (нет данных / выключено).
export function dayRingTarget(place: DayPlace, hasData: boolean): 'avatar' | 'header' | null {
  if (!hasData || place === 'off') return null
  return place === 'header' ? 'header' : 'avatar'
}

// То же для недели: в строке профиля, в шапке или нигде.
export function weekRingTarget(place: WeekPlace, hasData: boolean): 'profile' | 'header' | null {
  if (!hasData || place === 'off') return null
  return place === 'header' ? 'header' : 'profile'
}

export interface CircleGeometry {
  r: number
  circumference: number
  offsetBase: number
  offsetBonus: number
}

// Окружность с двумя слоями: базовый (доля выполненного) и бонусный (⭐, сверх 100%, максимум полный круг).
export function circleGeometry(r: number, basePct: number, bonusPct: number): CircleGeometry {
  const circumference = 2 * Math.PI * r
  return {
    r,
    circumference,
    offsetBase: circumference * (1 - basePct),
    offsetBonus: circumference * (1 - Math.min(1, bonusPct / 100)),
  }
}

export interface SquareGeometry {
  perimeter: number
  offsetBase: number
  offsetBonus: number
}

// Периметр скруглённого квадрата (4 прямые стороны + 4 дуги угла rx) для бейджа недели в шапке.
export function squareGeometry(side: number, rx: number, basePct: number, bonusPct: number): SquareGeometry {
  const perimeter = 4 * (side - 2 * rx) + 2 * Math.PI * rx
  return {
    perimeter,
    offsetBase: perimeter * (1 - basePct),
    offsetBonus: perimeter * (1 - Math.min(1, bonusPct / 100)),
  }
}

export interface HeptagonGeometry {
  points: string // вершины для <polygon> (первая — сверху, дальше по часовой стрелке)
  perimeter: number
  offsetBase: number
  offsetBonus: number
}

// Правильный семиугольник для кольца недели (BACKLOG 💧 2.3 «Выделение недельного круга»): 7 сторон — по числу дней
// недели, поэтому кольцо недели с первого взгляда отличается от круга дня. Прогресс идёт по периметру тем же
// приёмом stroke-dasharray/-dashoffset, что у круга и квадрата. Первая вершина — сверху (угол −90°), обход по часовой.
export const HEPTAGON_SIDES = 7
export function heptagonGeometry(center: number, radius: number, basePct: number, bonusPct: number): HeptagonGeometry {
  const pts: [number, number][] = []
  for (let i = 0; i < HEPTAGON_SIDES; i++) {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / HEPTAGON_SIDES
    pts.push([center + radius * Math.cos(a), center + radius * Math.sin(a)])
  }
  const side = 2 * radius * Math.sin(Math.PI / HEPTAGON_SIDES)
  const perimeter = side * HEPTAGON_SIDES
  return {
    points: pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' '),
    perimeter,
    offsetBase: perimeter * (1 - basePct),
    offsetBonus: perimeter * (1 - Math.min(1, bonusPct / 100)),
  }
}

export interface HeptagonSegment {
  x1: number // начало стороны (с небольшим зазором от вершины)
  y1: number
  x2: number // конец стороны
  y2: number
  fx: number // конец заливки базы (доля выполненного дня)
  fy: number
  bx: number // конец золотой полоски бонуса ⭐
  by: number
}

// Семиугольник недели, разрезанный на 7 сторон = 7 дней (пн…вс). Первая вершина — сверху, обход по часовой, значит
// понедельник — первая сторона справа от верхней вершины. У каждой стороны свой зазор `gap` (доля стороны) у обеих
// вершин, чтобы дни читались отдельными отрезками, а заливка стороны идёт от её начала к концу пропорционально
// `fills[i]` (0..1). `bonus[i]` (0..1) — золотая полоска бонуса того же дня.
// Чистая копия геометрии Дашборда (ProgressRing/heptagonGeometry) с разбивкой по сторонам.
export const WEEK_SIDES = 7
export function heptagonSegments(center: number, radius: number, fills: number[], bonus: number[] = [], gap = 0.06): HeptagonSegment[] {
  const v = (i: number): [number, number] => {
    const a = -Math.PI / 2 + (2 * Math.PI * (i % WEEK_SIDES)) / WEEK_SIDES
    return [center + radius * Math.cos(a), center + radius * Math.sin(a)]
  }
  const clamp = (x: number) => Math.min(1, Math.max(0, Number.isFinite(x) ? x : 0))
  const out: HeptagonSegment[] = []
  for (let i = 0; i < WEEK_SIDES; i++) {
    const [ax, ay] = v(i)
    const [bx, by] = v(i + 1)
    const dx = bx - ax
    const dy = by - ay
    const x1 = ax + dx * gap
    const y1 = ay + dy * gap
    const x2 = ax + dx * (1 - gap)
    const y2 = ay + dy * (1 - gap)
    const f = clamp(fills[i] ?? 0)
    const g = clamp(bonus[i] ?? 0)
    out.push({
      x1, y1, x2, y2,
      fx: x1 + (x2 - x1) * f, fy: y1 + (y2 - y1) * f,
      bx: x1 + (x2 - x1) * g, by: y1 + (y2 - y1) * g,
    })
  }
  return out
}
