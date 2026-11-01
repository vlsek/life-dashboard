import { sb } from './supabase'
import { notifyDataChanged } from './events'
import { friendlyError } from './friendlyError'
import { isMetricDone, metricExpectedOn } from './metrics'
import { withSkippedDay } from './skipYesterday'
import type { Metric, MetricValue } from './types'

// Быстрые действия на плашке метрики (BACKLOG 75.9, срез 1). Какие действия показывать — чистая функция; запись пропуска дня — одна функция.
export type QuickActionId = 'skip' | 'note' | 'value'

export interface QuickCtx {
  date: string // показанный день
  today: string
  yesterday: string
  value: MetricValue | undefined // текущее значение за этот день
}

// • skip — «пропустить день»: серию не рвёт (миграция 061). Только если колонка есть (миграция применена), день — сегодня или вчера
//   (база пускает только их), метрика в этот день нужна по расписанию и ещё не выполнена. Выполненную пропускать незачем.
// • note — булева с «спрашивать заметку», уже отмечена (поле «что делал(а)» видно только тогда).
// • value — числовая, не связанная с тренировками: перевести фокус в поле значения.
export function quickActions(m: Metric, ctx: QuickCtx): QuickActionId[] {
  const out: QuickActionId[] = []
  const done = isMetricDone(m, ctx.value, ctx.date)
  if ('skipped_days' in m && (ctx.date === ctx.today || ctx.date === ctx.yesterday) && metricExpectedOn(m, ctx.date) && !done) out.push('skip')
  if (m.type === 'boolean' && m.ask_note && ctx.value === true) out.push('note')
  if (m.type === 'number' && !m.source_exercise_id) out.push('value')
  return out
}

// Пропустить день: запись в metrics.skipped_days, затем DATA_CHANGED — серии, кольца и баллы пересчитываются (как в окне «вчера»).
// Возвращает текст ошибки или null.
export async function skipMetricDay(m: Pick<Metric, 'id' | 'skipped_days'>, date: string): Promise<string | null> {
  const { error } = await sb.from('metrics').update({ skipped_days: withSkippedDay(m, date) }).eq('id', m.id)
  if (error) return friendlyError(error, 'save')
  notifyDataChanged({ source: 'skip', metricId: m.id, date })
  return null
}
