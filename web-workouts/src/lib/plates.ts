// Калькулятор блинов (BACKLOG 69.15, срез 1): целевой вес → какие блины на каждую сторону штанги.
// Жадно от самого тяжёлого блина; считаем в сотых, чтобы 1,25 + 2,5 не давали хвостов вроде 3,7500000000000004.
export type PlateSystem = 'kg' | 'lb'

export const DEFAULT_PLATES: Record<PlateSystem, number[]> = { kg: [25, 20, 15, 10, 5, 2.5, 1.25], lb: [45, 35, 25, 10, 5, 2.5] }
export const BARS: Record<PlateSystem, number[]> = { kg: [20, 15], lb: [45, 35] }
export const PLATES_KEY = 'workouts_plates_'

const LB = new Set(['lb', 'lbs', 'фунт', 'фунта', 'фунтов', 'фунты'])
// Система блинов по единице веса: фунты — lb, всё прочее (кг, пусто) — кг
export const plateSystem = (unit: string | null | undefined): PlateSystem => (unit && LB.has(unit.trim().toLowerCase().replace(/\.$/, '')) ? 'lb' : 'kg')

const cents = (x: number) => Math.round(x * 100)

export interface PlateCount { plate: number; count: number }
export interface PlateResult {
  perSide: PlateCount[] // от тяжёлого к лёгкому
  loaded: number // сколько реально получится на штанге (гриф + блины с двух сторон)
  remainder: number // сколько не добрали до цели (>= 0): нет подходящих блинов
  belowBar: boolean // цель меньше грифа
}

export function platesPerSide(target: number, bar: number, plates: readonly number[]): PlateResult {
  const usable = [...new Set(plates.filter((p) => Number.isFinite(p) && p > 0))].sort((a, b) => b - a)
  if (!Number.isFinite(target) || target <= 0 || target < bar) return { perSide: [], loaded: bar, remainder: 0, belowBar: Number.isFinite(target) && target > 0 && target < bar }
  let left = Math.floor((cents(target) - cents(bar)) / 2) // сотые на одну сторону; нечётную сотую отбрасываем
  const perSide: PlateCount[] = []
  for (const p of usable) {
    const n = Math.floor(left / cents(p))
    if (n > 0) { perSide.push({ plate: p, count: n }); left -= n * cents(p) }
  }
  const sideTotal = perSide.reduce((s, x) => s + x.count * cents(x.plate), 0)
  const loaded = (cents(bar) + 2 * sideTotal) / 100
  return { perSide, loaded, remainder: Math.max(0, (cents(target) - cents(bar) - 2 * sideTotal) / 100), belowBar: false }
}

// Набор блинов из текста «25, 20, 10 2.5»: разделители — запятая, точка с запятой, пробел (дробная часть — ТОЛЬКО точкой, запятая всегда разделитель);
// мусор, нули и больше 200 отбрасываются, дубликаты склеиваются. Пустой или негодный ввод → null (вызывающий берёт набор по умолчанию).
export function parsePlates(text: string): number[] | null {
  const nums = text.split(/[,;\s]+/).filter(Boolean).map(Number).filter((n) => Number.isFinite(n) && n > 0 && n <= 200)
  const list = [...new Set(nums)].sort((a, b) => b - a)
  return list.length ? list : null
}

export const formatPlates = (list: readonly number[]): string => list.join(', ')

export function readPlates(system: PlateSystem): number[] {
  try {
    const raw = localStorage.getItem(PLATES_KEY + system)
    const parsed = raw ? (JSON.parse(raw) as unknown) : null
    if (Array.isArray(parsed)) {
      const list = parsed.filter((n): n is number => typeof n === 'number' && n > 0 && n <= 200)
      if (list.length) return [...new Set(list)].sort((a, b) => b - a)
    }
  } catch { /* битый JSON или нет доступа к storage — набор по умолчанию */ }
  return [...DEFAULT_PLATES[system]]
}

export function writePlates(system: PlateSystem, list: readonly number[]): void {
  try { localStorage.setItem(PLATES_KEY + system, JSON.stringify(list)) } catch { /* ignore */ }
}
