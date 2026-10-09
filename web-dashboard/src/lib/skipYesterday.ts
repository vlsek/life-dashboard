import { addDays, fmtDate } from './date'
import { remainingMetricsToday } from './evening'
import { isMetricDone, metricExpectedOn } from './metrics'
import { computeStreakSkipping } from './streaks'
import type { Metric, MetricValue } from './types'

// Окно «вчерашние невыполненные метрики» (BACKLOG 47.3, миграция 061). Владелец: показывать при первом открытии нового дня, раз в день, с выключателем в настройках;
// «отменить» = ПРОПУСТИТЬ день без разрыва серии. Здесь только чистая логика (без сети и DOM); сеть — в useSkipYesterday.ts.
export const SKIP_SHOWN_KEY = 'skip_prompt_shown'
export const SKIP_OFF_KEY = 'skip_prompt_off' // '1' — выключено в «Глобальных настройках»

export interface SkipItem {
  metric: Metric
  value: MetricValue
  /** серия метрики до вчерашнего дня (0 — серии нет, пропуск ничего не спасает) */
  streakBefore: number
  /** вчерашний пробел оборвёт идущую серию */
  breaksStreak: boolean
}

export function skipPromptEnabled(): boolean {
  try {
    return localStorage.getItem(SKIP_OFF_KEY) !== '1'
  } catch {
    return true
  }
}

// Показывать ли окно: включено, есть что показать и сегодня его ещё не показывали (раз в день).
export function shouldShowSkipPrompt(enabled: boolean, count: number, shownOn: string | null, todayIso: string): boolean {
  return enabled && count > 0 && shownOn !== todayIso
}

// Метрики, которые вчера были нужны и не выполнены (та же логика, что у вечерней плашки; «N раз в неделю», «не чаще N», уже пропущенные и метрики без
// «считать серию» сюда не попадают), с числом дней серии до вчера. Сначала те, чью серию вчерашний пробел оборвёт.
// doneDays — даты, когда метрика выполнена (за последние ~две недели достаточно: нужен только факт «серия идёт»).
export function skippableYesterday(
  metrics: Metric[],
  valueByMetric: Record<string, MetricValue>,
  doneDaysByMetric: Record<string, Set<string>>,
  yesterday: Date,
): SkipItem[] {
  const yStr = fmtDate(yesterday)
  const before = addDays(yesterday, -1)
  const list = remainingMetricsToday(
    metrics.filter((m) => m.count_streak !== false),
    valueByMetric,
    yStr,
  )
  const items = list.map((metric): SkipItem => {
    const done = doneDaysByMetric[metric.id] ?? new Set<string>()
    const streakBefore = computeStreakSkipping(done, (d) => !metricExpectedOn(metric, d) && !done.has(d), before)
    return { metric, value: valueByMetric[metric.id], streakBefore, breaksStreak: streakBefore > 0 }
  })
  return items.sort((a, b) => Number(b.breaksStreak) - Number(a.breaksStreak) || b.streakBefore - a.streakBefore)
}

// Новый список пропущенных дат для записи в metrics.skipped_days: без повторов, по возрастанию. Старые даты НЕ вычищаем — база запрещает менять записи
// старше вчерашнего дня (защита от «нарисованной» серии), список растёт максимум на день.
export function withSkippedDay(m: Pick<Metric, 'skipped_days'>, day: string): string[] {
  return [...new Set([...(m.skipped_days ?? []), day])].sort()
}

// Миграция 061 применена, если колонка пришла вместе с метрикой (select *). Иначе пропуск записать некуда — окно не показываем.
export function skipSupported(metrics: Array<Record<string, unknown>>): boolean {
  return metrics.length > 0 && 'skipped_days' in metrics[0]
}

// Для проверки «серия идёт»: выполненные даты метрики по строкам daily_values.
export function doneDaysOf(metric: Metric, rows: { date: string; value: MetricValue }[]): Set<string> {
  const out = new Set<string>()
  for (const r of rows) if (isMetricDone(metric, r.value, r.date)) out.add(r.date)
  return out
}
