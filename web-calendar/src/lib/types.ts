export type PlannedItemType = 'custom' | 'goal'

export interface PlannedItem {
  type: PlannedItemType
  text: string
  done: boolean
}

// Старые записи в базе хранились простыми строками — их нормализуем на лету
// (portировано из calendar.js: planned.map(p => typeof p === 'string' ? {...} : p)).
export type RawPlannedItem = PlannedItem | string

export interface DailyNote {
  date: string // ISO
  planned_goals: RawPlannedItem[] | null
}

export interface CalendarCell {
  day: number
  dateStr: string
  isToday: boolean
  planned: PlannedItem[]
}
