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

// Цель со сроком (goals.deadline) — показывается в календаре на день срока (BACKLOG 940, часть 1); только чтение.
export interface GoalDeadline {
  id: string
  name: string
  done: boolean
}

export interface CalendarCell {
  day: number
  dateStr: string
  isToday: boolean
  planned: PlannedItem[]
  deadlines: GoalDeadline[]
}
