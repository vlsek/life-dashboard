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
