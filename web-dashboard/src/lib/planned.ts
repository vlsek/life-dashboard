import { addDaysIso } from './date'

// Чистая логика блока «Цели на сегодня» (план на день + перенос незавершённого) — портировано из
// renderPlanned()/openCarryOverModal() в dashboard.js. Без сети и без Vue, чтобы проверяться тестами.
// План хранится в daily_notes.planned_goals (jsonb-массив) — тот же формат, что читают прогресс
// дня/недели (progress.ts) и календарь.

export interface PlannedEntry {
  type?: string // 'goal' — привязан к цели по имени; 'custom' — личный пункт на день
  text: string
  done?: boolean // только у custom; у goal «выполнено» берётся из самой цели
  bonus?: boolean // доп. пункт: не в базовые 100%, при выполнении +% сверху
  time?: string // «HH:MM» — необязательное время напоминания (v1.20); классика поле не знает и не трогает
}

export interface PlanGoal {
  id: string
  name: string
  stages: number | null
  done: boolean
  current_stage: number | null
  done_date?: string | null // день выполнения (для блока «выполнено из целей», BACKLOG 1078)
}

export interface PlanNote {
  date: string
  planned_goals: unknown
}

// Старые записи — просто строки (имена целей) — превращаем в {type:'goal'}; всё, что не строка
// и не объект с текстом, выбрасываем (в оригинале такая запись роняла отрисовку).
export function normalizePlanned(raw: unknown): PlannedEntry[] {
  if (!Array.isArray(raw)) return []
  const out: PlannedEntry[] = []
  for (const p of raw) {
    if (typeof p === 'string') out.push({ type: 'goal', text: p })
    else if (p && typeof p === 'object' && typeof (p as PlannedEntry).text === 'string') out.push({ ...(p as PlannedEntry) })
  }
  return out
}

// Все операции возвращают НОВЫЙ массив — компонент сначала показывает результат, потом сохраняет.
// `done` — «уже сделано»: пункт создаётся выполненным (то, что человек сделал не из списка целей и
// хочет засчитать в прогресс дня/недели, не отмечая потом галочкой).
export function addCustom(planned: PlannedEntry[], rawText: string, time?: string | null, done = false): PlannedEntry[] {
  const text = rawText.trim()
  if (!text) return planned
  const entry: PlannedEntry = { type: 'custom', text, done }
  if (isValidTime(time)) entry.time = time
  return [...planned, entry]
}

// Время напоминания — строго «HH:MM», 24 часа (то, что отдаёт <input type="time">). Пустая строка,
// null и мусор — «времени нет».
export function isValidTime(v: unknown): v is string {
  return typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v)
}

// Задать или снять (null / пусто / мусор) время у пункта. Поле убирается совсем, а не пишется пустым:
// в jsonb не копится мусор.
export function setTimeAt(planned: PlannedEntry[], index: number, time: string | null): PlannedEntry[] {
  return planned.map((p, i) => {
    if (i !== index) return p
    const { time: _old, ...rest } = p
    return isValidTime(time) ? { ...rest, time } : rest
  })
}

export function addGoal(planned: PlannedEntry[], goalName: string, time?: string | null): PlannedEntry[] {
  if (planned.some((p) => p.type === 'goal' && p.text === goalName)) return planned
  const entry: PlannedEntry = { type: 'goal', text: goalName }
  if (isValidTime(time)) entry.time = time
  return [...planned, entry]
}

export function removeAt(planned: PlannedEntry[], index: number): PlannedEntry[] {
  return planned.filter((_, i) => i !== index)
}

export function toggleBonus(planned: PlannedEntry[], index: number): PlannedEntry[] {
  return planned.map((p, i) => (i === index ? { ...p, bonus: !p.bonus } : p))
}

export function setCustomDone(planned: PlannedEntry[], index: number, done: boolean): PlannedEntry[] {
  return planned.map((p, i) => (i === index ? { ...p, done } : p))
}

// Цели, которые можно добавить в план: ещё не выполненные и ещё не в плане этого дня.
export function goalOptions(goals: PlanGoal[], planned: PlannedEntry[]): PlanGoal[] {
  const taken = new Set(planned.filter((p) => p.type === 'goal').map((p) => p.text))
  return goals.filter((g) => !g.done && !taken.has(g.name))
}

// Цели, отмеченные выполненными именно в этот день (done_date = day) и которых нет среди пунктов-целей плана этого дня:
// они иначе нигде не видны на главной — из выбора выпали (выполнены), в плане их не было (BACKLOG 1078). Порядок — как в списке целей.
export function doneOnDay(goals: PlanGoal[], planned: PlannedEntry[], day: string): PlanGoal[] {
  const taken = new Set(planned.filter((p) => p.type === 'goal').map((p) => p.text))
  return goals.filter((g) => g.done && g.done_date === day && !taken.has(g.name))
}

// Как рисовать пункт-цель: 'missing' — цель удалена; 'single' — одноэтапная (чекбокс);
// 'staged' — многоэтапная (только «этап/этапов», отметка идёт через раздел «Цели»).
export type GoalRowKind = 'missing' | 'single' | 'staged'
export function goalRowKind(goal: PlanGoal | undefined): GoalRowKind {
  if (!goal) return 'missing'
  return (goal.stages ?? 1) <= 1 ? 'single' : 'staged'
}
export function stageLabel(goal: PlanGoal): string {
  return `${goal.current_stage ?? 0}/${goal.stages ?? 1}`
}

export interface CarryCandidate {
  text: string
  date: string
  time?: string // время исходного пункта — переносится вместе с ним (BACKLOG 14, 11:08)
}

export const CARRY_OVER_DAYS = 7

// Невыполненные ОБЫЧНЫЕ пункты (не цели, не бонусные) за последние 7 дней, которых ещё нет в плане
// этого дня. Свежие даты идут первыми; одинаковый текст с нескольких дней показывается один раз
// (с самой свежей датой).
export function carryOverCandidates(notes: PlanNote[], todayIso: string, planned: PlannedEntry[]): CarryCandidate[] {
  const todayTexts = new Set(planned.filter((p) => p.type === 'custom').map((p) => p.text))
  const earliest = addDaysIso(todayIso, -CARRY_OVER_DAYS)
  const seen = new Set<string>()
  const out: CarryCandidate[] = []
  for (const n of [...notes].sort((a, b) => b.date.localeCompare(a.date))) {
    if (n.date >= todayIso || n.date < earliest) continue
    for (const p of normalizePlanned(n.planned_goals)) {
      if (p.type !== 'custom' || p.done || p.bonus) continue
      if (todayTexts.has(p.text) || seen.has(p.text)) continue
      seen.add(p.text)
      out.push(isValidTime(p.time) ? { text: p.text, date: n.date, time: p.time } : { text: p.text, date: n.date })
    }
  }
  return out
}

export type CarriedItem = string | { text: string; time?: string | null }

export function appendCarried(planned: PlannedEntry[], items: CarriedItem[]): PlannedEntry[] {
  if (items.length === 0) return planned
  return [
    ...planned,
    ...items.map((it): PlannedEntry => {
      const text = typeof it === 'string' ? it : it.text
      const time = typeof it === 'string' ? null : it.time
      const entry: PlannedEntry = { type: 'custom', text, done: false }
      if (isValidTime(time)) entry.time = time
      return entry
    }),
  ]
}
