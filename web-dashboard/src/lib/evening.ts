import { isMetricDone, metricExpectedOn, metricNumericValue } from './metrics'
import type { Metric, MetricValue } from './types'

// Вечернее напоминание о невыполненных метриках (docs/BACKLOG.md, 5.2): начиная с 21:00
// по локальному времени, если на сегодня остались метрики по расписанию, показываем плашку
// «сделайте их, чтобы не потерять стрейк». Здесь — только чистые функции без сети/DOM,
// сеть и таймер — в useEveningReminder.ts. Покрыто evening.test.ts.

export const EVENING_HOUR = 21

// Локальное время устройства: getHours(), а не UTC — «вечер» у человека свой в любом поясе.
export function isEveningTime(now: Date, hour: number = EVENING_HOUR): boolean {
  return now.getHours() >= hour
}

// Метрики, которые нужны именно сегодня по расписанию и ещё не выполнены. Та же логика, что у
// подсветки «ещё осталось» в карточке дня (isRemaining в daily.ts): «N раз в неделю» и
// «не чаще N» к конкретному дню не привязаны и сюда не попадают.
export function remainingMetricsToday(metrics: Metric[], valueByMetric: Record<string, MetricValue>, dateStr: string): Metric[] {
  return metrics.filter((m) => metricExpectedOn(m, dateStr) && !isMetricDone(m, valueByMetric[m.id]))
}

// Показывать ли плашку: уже вечер, есть что доделывать, и сегодня её ещё не закрывали.
export function shouldShowEveningReminder(now: Date, remainingCount: number, dismissedOn: string | null, todayIso: string): boolean {
  return isEveningTime(now) && remainingCount > 0 && dismissedOn !== todayIso
}

// Подпись прогресса для раскрытого списка: у числовых метрик и подходов «сделано / цель ед.»,
// у остальных (галочка, мультивыбор) подписи нет — само название говорит достаточно.
export function metricProgressLabel(m: Metric, value: MetricValue): string {
  if (m.type !== 'number' && m.type !== 'sets') return ''
  const done = metricNumericValue(m, value) ?? 0
  const goal = m.goal_value ?? 0
  const unit = m.unit ? ' ' + m.unit : ''
  return `${done} / ${goal}${unit}`
}
