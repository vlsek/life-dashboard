import { cleanSets } from './workouts'
import { fromRows, toRows } from './sides'
import type { SetRow } from './sides'
import type { WorkoutSet } from './types'

// «+ подход» прямо из таблицы записей (BACKLOG 590, «Добавлять подходы прямо из таблицы»): после первого подхода следующие
// добавляются одной кнопкой в строке записи, без окна; новый подход копирует значения предыдущего. Работает на тех же «строках»,
// что и форма записи (lib/sides.ts): для упражнений с левой/правой стороной копируется ПАРА Л+П целиком. Формат хранения не меняется.
export interface QuickSetResult {
  sets: WorkoutSet[]
  count: number // сколько подходов (строк) стало
}

export function appendCopiedSet(sets: WorkoutSet[], now: string | null): QuickSetResult | null {
  const rows = toRows(sets)
  if (rows.length === 0) return null // первого подхода ещё нет — его вносят окном записи
  const last = rows[rows.length - 1]
  const copy: SetRow = { time: now, cells: {} }
  for (const key of Object.keys(last.cells) as (keyof SetRow['cells'])[]) {
    const cell = last.cells[key]
    if (cell) copy.cells[key] = { ...cell }
  }
  const next = [...rows, copy]
  return { sets: cleanSets(fromRows(next)), count: next.length }
}

// Убрать последний подход (строку); единственный подход так не убирают — запись удаляется отдельной кнопкой
export function removeLastSet(sets: WorkoutSet[]): QuickSetResult | null {
  const rows = toRows(sets)
  if (rows.length < 2) return null
  const next = rows.slice(0, -1)
  return { sets: cleanSets(fromRows(next)), count: next.length }
}

export function setCount(sets: WorkoutSet[]): number {
  return toRows(sets).length
}
