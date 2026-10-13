import type { Goal } from './types'

// Горизонты целей (BACKLOG 1048+1050, миграция 084). Порядок = порядок разделов в виде «По срокам».
export type Horizon = 'now' | 'soon' | 'month' | 'day'
export const HORIZONS: Horizon[] = ['now', 'soon', 'month', 'day']

// Ключи i18n названий горизонтов (литералами — t() принимает только известные ключи).
export const HORIZON_KEYS = { now: 'goals_hor_now', soon: 'goals_hor_soon', month: 'goals_hor_month', day: 'goals_hor_day' } as const

export function isHorizon(v: unknown): v is Horizon {
  return typeof v === 'string' && (HORIZONS as string[]).includes(v)
}

// Горизонт цели: сохранённый, а если его нет (старые цели, нет колонки) — из срока: есть deadline → «В конкретный день», нет → «Сейчас».
export function effectiveHorizon(g: Pick<Goal, 'deadline'> & { horizon?: string | null }): Horizon {
  if (isHorizon(g.horizon)) return g.horizon
  return g.deadline ? 'day' : 'now'
}

// Какие горизонты можно выбрать в форме: без колонки (миграция 084 не применена) — только те, что выражаются без неё.
export function horizonOptions(hasColumn: boolean): Horizon[] {
  return hasColumn ? HORIZONS : ['now', 'day']
}

// Поля горизонта и срока для записи в базу. Срок хранится только у «В конкретный день»; колонка horizon пишется, только если она есть.
export function horizonFields(res: { horizon?: Horizon | null; deadline: string }, hasColumn: boolean): { horizon?: Horizon; deadline?: string | null } {
  const h: Horizon = res.horizon ?? (res.deadline ? 'day' : 'now')
  const out: { horizon?: Horizon; deadline?: string | null } = { deadline: h === 'day' ? res.deadline || null : null }
  if (hasColumn) out.horizon = h
  return out
}

function byDeadline(a: Goal, b: Goal): number {
  if (!a.deadline && !b.deadline) return 0
  if (!a.deadline) return 1
  if (!b.deadline) return -1
  return a.deadline.localeCompare(b.deadline)
}

// Группы активных целей по горизонту (только непустые, в порядке HORIZONS). «В конкретный день» — по дате, остальные — по порядку создания.
export function groupByHorizon(active: Goal[]): [Horizon, Goal[]][] {
  const groups: Record<Horizon, Goal[]> = { now: [], soon: [], month: [], day: [] }
  for (const g of active) groups[effectiveHorizon(g)].push(g)
  return HORIZONS.filter((h) => groups[h].length).map((h) => [h, h === 'day' ? groups[h].slice().sort(byDeadline) : groups[h]])
}

// Вид страницы: «По категориям» (по умолчанию) / «По срокам»; выбор помнится на устройстве.
export type GoalsView = 'category' | 'horizon'
export const GOALS_VIEW_KEY = 'goals_view'

export function loadGoalsView(): GoalsView {
  try {
    return localStorage.getItem(GOALS_VIEW_KEY) === 'horizon' ? 'horizon' : 'category'
  } catch {
    return 'category'
  }
}

export function saveGoalsView(v: GoalsView): void {
  try {
    localStorage.setItem(GOALS_VIEW_KEY, v)
  } catch {
    /* хранилище недоступно — вид просто не запомнится */
  }
}
