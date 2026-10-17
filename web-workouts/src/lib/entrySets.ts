// Подходы сегодняшней записи «строками, как на главной» (BACKLOG 62.3): строка на подход (время, повторы, длительность, вес), правка прямо в строке,
// «+ подход» добавляет новую строку, × убирает строку. Работает на тех же «строках», что и форма записи (lib/sides.ts): Л+П — одна строка с двумя ячейками.
// Формат хранения не меняется. Каждая функция возвращает НОВЫЙ список подходов для сохранения или null — «ничего не менять».
import { cleanSets } from './workouts'
import { fromRows, toRows } from './sides'
import type { CellKey } from './sides'
import type { WorkoutSet } from './types'

export type CellField = 'reps' | 'weight' | 'duration'

// Текст поля → число; пусто или не число → null (запятая как десятичный разделитель допустима)
export function parseNum(raw: string): number | null {
  const s = raw.trim().replace(',', '.')
  if (s === '') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

const finish = (rows: ReturnType<typeof toRows>): WorkoutSet[] => cleanSets(fromRows(rows))

// Правка одной ячейки. Повторы обязательны: очистить поле нельзя — возвращаем null (подход бы пропал при очистке пустых), прежнее значение остаётся.
export function setCellValue(sets: WorkoutSet[], rowIndex: number, key: CellKey, field: CellField, raw: string): WorkoutSet[] | null {
  const rows = toRows(sets)
  const cell = rows[rowIndex]?.cells[key]
  if (!cell) return null
  const value = parseNum(raw)
  if (field === 'reps' && value === null) return null
  if (value !== null && value < 0) return null
  cell[field] = value
  return finish(rows)
}

export function setRowTime(sets: WorkoutSet[], rowIndex: number, time: string): WorkoutSet[] | null {
  const rows = toRows(sets)
  if (!rows[rowIndex]) return null
  rows[rowIndex].time = time || null
  return finish(rows)
}

// «Особенность» строки: пусто — убрать. Строка без повторов пропадёт в cleanSets, как и при правке других полей.
export function setRowVariation(sets: WorkoutSet[], rowIndex: number, text: string): WorkoutSet[] | null {
  const rows = toRows(sets)
  if (!rows[rowIndex]) return null
  rows[rowIndex].variation = text.trim() || null
  return finish(rows)
}

// Убрать строку; единственную не убирают — запись удаляется своей кнопкой
export function removeRowAt(sets: WorkoutSet[], rowIndex: number): WorkoutSet[] | null {
  const rows = toRows(sets)
  if (rows.length < 2 || !rows[rowIndex]) return null
  rows.splice(rowIndex, 1)
  return finish(rows)
}
