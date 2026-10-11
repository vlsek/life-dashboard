// «Насколько масштабная покупка?» (BACKLOG 58.4, владелец 2026-10-11 15:22): при добавлении вещи выбираем ступень масштаба с понятными примерами,
// а цена предлагается «справедливая» — столько дней вашего среднего заработка стоит такая покупка. Цену по-прежнему можно поправить руками.
// Чистая логика (без Vue/сети). Хранится только итоговая цена, как и раньше.
export type ScaleId = 'tiny' | 'small' | 'notable' | 'big' | 'huge'

export interface ScaleStep {
  id: ScaleId
  days: number // сколько ДНЕЙ среднего заработка стоит покупка такого масштаба
}

export const SCALES: readonly ScaleStep[] = [
  { id: 'tiny', days: 0.5 }, // кофе, мороженое, мелочь
  { id: 'small', days: 2 }, // ужин в кафе, книга
  { id: 'notable', days: 5 }, // кроссовки, настольная игра
  { id: 'big', days: 14 }, // билет на концерт, наушники
  { id: 'huge', days: 45 }, // отпуск, техника
]

export const NEW_ACCOUNT_DAYS = 14 // моложе — средний заработок ещё мало что говорит, берём не менее 14 дней в знаменателе
export const MIN_DAILY_COINS = 10 // «дежурная» ставка, если человек ещё ничего не заработал (баллы)
export const MIN_DAILY_SPARKS = 3 // то же в режиме огоньков

const DAY_MS = 86_400_000

// Средний заработок в день: всего заработано / дней с регистрации (не меньше 14); нет данных или 0 — дежурная ставка.
export function dailyRate(total: number | null | undefined, createdAt: string | null | undefined, sparks: boolean, now: Date = new Date()): number {
  const floor = sparks ? MIN_DAILY_SPARKS : MIN_DAILY_COINS
  const created = createdAt ? Date.parse(createdAt) : NaN
  if (!Number.isFinite(total as number) || (total as number) <= 0 || !Number.isFinite(created)) return floor
  const days = Math.max(NEW_ACCOUNT_DAYS, (now.getTime() - created) / DAY_MS)
  return Math.max(floor, (total as number) / days)
}

// «Красивое» округление: до 1 — для малых, до 5 — до 100, до 10 — до 500, до 50 — дальше
export function niceRound(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 1
  const step = n < 20 ? 1 : n < 100 ? 5 : n < 500 ? 10 : 50
  return Math.max(1, Math.round(n / step) * step)
}

export function suggestPrice(id: ScaleId, rate: number): number {
  const step = SCALES.find((s) => s.id === id)
  return niceRound((step ? step.days : 1) * rate)
}
