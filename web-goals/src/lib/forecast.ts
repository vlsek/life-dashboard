// Прогноз «успеваю ли к сроку» (BACKLOG 76.11). Только для активной многоэтапной цели со сроком.
// Без выдуманных выводов (правило 73.5): темп считаем, лишь когда цели не меньше 7 дней и сделан хотя бы один этап;
// иначе показываем только «нужно N в неделю».
import { daysUntil } from './goals'

export type ForecastStatus = 'ontrack' | 'behind' | 'unknown'

export interface Forecast {
  status: ForecastStatus
  left: number // сколько этапов осталось
  needPerWeek: number // сколько этапов в неделю нужно (до 1 знака)
  pacePerWeek: number | null // фактический темп за время жизни цели; null — рано судить
}

export const MIN_HISTORY_DAYS = 7

const round1 = (x: number) => Math.round(x * 10) / 10

export function forecastGoal(
  g: { stages: number; current_stage: number; done: boolean; deadline: string | null; created_at: string },
  today: Date = new Date(),
): Forecast | null {
  if (g.done || !g.deadline || !(g.stages > 1)) return null
  const left = g.stages - (g.current_stage ?? 0)
  if (left <= 0) return null
  const daysLeft = daysUntil(g.deadline, today)
  if (daysLeft < 0) return null // просрочено — это уже видно по чипу срока
  const needPerWeek = round1((left / Math.max(daysLeft, 1)) * 7)

  const created = new Date(g.created_at)
  const t0 = new Date(today)
  t0.setHours(0, 0, 0, 0)
  const age = Number.isNaN(created.getTime()) ? 0 : Math.floor((t0.getTime() - created.getTime()) / 86400000)
  const done = g.current_stage ?? 0
  if (age < MIN_HISTORY_DAYS) return { status: 'unknown', left, needPerWeek, pacePerWeek: null }
  const pacePerWeek = round1((done / age) * 7)
  // допуск: темп в пределах 0,1 этапа от нужного считаем «успеваю» (округление)
  const status: ForecastStatus = done > 0 && pacePerWeek + 0.05 >= needPerWeek ? 'ontrack' : 'behind'
  return { status, left, needPerWeek, pacePerWeek }
}
