import type { DayPlace, WeekPlace } from './progressSettings'

// Портировано из renderDayProgressRing()/renderWeekProgress()/renderHeader*Badge() в dashboard.js —
// только чистая логика: где показывать кольцо и какие у него размеры.

export interface RingData {
  basePct: number // 0..1
  bonusPct: number
  totalPct: number
  title: string
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
