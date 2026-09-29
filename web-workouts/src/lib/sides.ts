import type { WorkoutSet } from './types'

// Л/П в одном блоке (BACKLOG 3.1). В базе подход по-прежнему — отдельный WorkoutSet со
// стороной 'L'/'R' (так читают классика, рекорды по сторонам и графики), а форма показывает
// пару «левая + правая» одной строкой. Формат хранения не меняется, миграций нет.
export type CellKey = 'L' | 'R' | 'P'

export interface SetCell {
  reps: number | null
  weight: number | null
  duration: number | null
}

export interface SetRow {
  time: string | null
  cells: Partial<Record<CellKey, SetCell>>
}

export const CELL_ORDER: CellKey[] = ['L', 'R', 'P']

export function blankCell(): SetCell {
  return { reps: null, weight: null, duration: null }
}

export function blankRow(bilateral: boolean, time: string | null = null): SetRow {
  return { time, cells: bilateral ? { L: blankCell(), R: blankCell() } : { P: blankCell() } }
}

const toCell = (s: WorkoutSet): SetCell => ({ reps: s.reps, weight: s.weight, duration: s.duration })
const otherSide = (side: 'L' | 'R') => (side === 'L' ? 'R' : 'L')

// Подходы → строки. Идущие подряд L+R (в любом порядке) склеиваются в одну строку; одиночная
// сторона получает пустую вторую ячейку; подход без стороны — обычная строка (ячейка 'P').
export function toRows(sets: WorkoutSet[]): SetRow[] {
  const rows: SetRow[] = []
  for (let i = 0; i < sets.length; i++) {
    const s = sets[i]
    if (s.side === 'L' || s.side === 'R') {
      const next = sets[i + 1]
      const row: SetRow = { time: s.time, cells: { [s.side]: toCell(s) } }
      if (next && next.side === otherSide(s.side)) {
        row.cells[next.side as 'L' | 'R'] = toCell(next)
        i++
      } else {
        row.cells[otherSide(s.side)] = blankCell()
      }
      rows.push(row)
    } else {
      rows.push({ time: s.time, cells: { P: toCell(s) } })
    }
  }
  return rows
}

// Строки → подходы (порядок L, R, P; время строки общее). Пустые ячейки отсеет cleanSets.
export function fromRows(rows: SetRow[]): WorkoutSet[] {
  const out: WorkoutSet[] = []
  for (const row of rows) {
    for (const key of CELL_ORDER) {
      const c = row.cells[key]
      if (!c) continue
      out.push({ reps: c.reps, weight: c.weight, time: row.time, duration: c.duration, side: key === 'P' ? null : key })
    }
  }
  return out
}
