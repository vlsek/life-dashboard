// BACKLOG 75.7 «Инсайты «если… то…» с честными порогами», срез 1: самочувствие (75.3) в дни, когда вода выполнена, и в остальные дни.
// Чистая логика без сети и Vue. Показываем только при достаточных данных; это корреляция, а не причина (пометка в карточке обязательна).
export const MIN_RATED_DAYS = 30 // дней с оценкой самочувствия в окне
export const MIN_GROUP_DAYS = 7 // в каждой из двух групп
export const MIN_DIFF = 0.5 // разница средних оценок (по шкале 1–5), меньше — «заметной разницы нет»
export const WINDOW_DAYS = 90

export interface Insight {
  withAvg: number
  withoutAvg: number
  nWith: number
  nWithout: number
  diff: number // withAvg − withoutAvg, округлено до 0.1
}

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
const r1 = (x: number) => Math.round(x * 10) / 10

// mood: дата → оценка 1–5 (только дни с оценкой); doneDays: даты, когда условие выполнено. Дней без оценки не учитываем вовсе.
// null — данных мало или разница не заметна.
export function moodInsight(mood: Record<string, number>, doneDays: ReadonlySet<string>): Insight | null {
  const dates = Object.keys(mood)
  if (dates.length < MIN_RATED_DAYS) return null
  const w: number[] = []
  const wo: number[] = []
  for (const d of dates) (doneDays.has(d) ? w : wo).push(mood[d])
  if (w.length < MIN_GROUP_DAYS || wo.length < MIN_GROUP_DAYS) return null
  const diff = avg(w) - avg(wo)
  if (Math.abs(diff) < MIN_DIFF) return null
  return { withAvg: r1(avg(w)), withoutAvg: r1(avg(wo)), nWith: w.length, nWithout: wo.length, diff: r1(diff) }
}
