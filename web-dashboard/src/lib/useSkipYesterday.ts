import { ref } from 'vue'
import { sb } from './supabase'
import { addDays, fmtDate, todayStr } from './date'
import { notifyDataChanged } from './events'
import { SKIP_SHOWN_KEY, doneDaysOf, shouldShowSkipPrompt, skipPromptEnabled, skipSupported, skippableYesterday, withSkippedDay, type SkipItem } from './skipYesterday'
import { withWaterGoal } from './waterGoal'
import { dropWaterIfOff, ensureTrackWater } from './waterTracking'
import type { Metric, MetricValue } from './types'

// Окно «вчерашние невыполненные метрики» (BACKLOG 47.3): при первом открытии нового дня показывает метрики, не выполненные вчера, и даёт ПРОПУСТИТЬ день
// (серия не рвётся — миграция 061) или оставить как есть. Отдельный композабл со своим небольшим запросом (как вечернее напоминание): метрики + значения за 2 недели.
// Окно показывается раз в день (метка ставится в момент показа), выключается в «Глобальных настройках» (localStorage skip_prompt_off).
const WINDOW_DAYS = 14

export function useSkipYesterday() {
  const items = ref<SkipItem[]>([])
  const visible = ref(false)
  const error = ref('')
  let loaded = false

  async function load(userId: string) {
    if (loaded || !userId || !skipPromptEnabled()) return
    loaded = true
    const today = todayStr()
    if (readShown() === today) return
    const yesterday = addDays(new Date(), -1)
    const yStr = fmtDate(yesterday)
    const [metricsRes, valuesRes] = await Promise.all([
      sb.from('metrics').select('*').eq('user_id', userId).eq('active', true).order('position'),
      sb.from('daily_values').select('metric_id, date, value').eq('user_id', userId).gte('date', fmtDate(addDays(yesterday, -WINDOW_DAYS))).lte('date', yStr),
    ])
    if (metricsRes.error || valuesRes.error) return // вспомогательное окно: при сбое молча ничего не показываем
    const raw = (metricsRes.data || []) as Array<Record<string, unknown>>
    if (!skipSupported(raw)) return // миграция 061 не применена — пропуск записать некуда
    const rows = (valuesRes.data || []) as { metric_id: string; date: string; value: MetricValue }[]
    const metrics = dropWaterIfOff(await withWaterGoal(userId, raw as unknown as Metric[]), await ensureTrackWater(userId))
    const valueYesterday: Record<string, MetricValue> = {}
    const byMetric: Record<string, { date: string; value: MetricValue }[]> = {}
    for (const r of rows) {
      if (r.date === yStr) valueYesterday[r.metric_id] = r.value
      ;(byMetric[r.metric_id] ||= []).push({ date: r.date, value: r.value })
    }
    const doneDays: Record<string, Set<string>> = {}
    for (const m of metrics) doneDays[m.id] = doneDaysOf(m, byMetric[m.id] ?? [])
    const list = skippableYesterday(metrics, valueYesterday, doneDays, yesterday)
    if (!shouldShowSkipPrompt(true, list.length, readShown(), today)) return
    items.value = list
    visible.value = true
    markShown(today) // раз в день: перезагрузка страницы окно не вернёт
  }

  // Пропустить вчерашний день для метрики: запись в metrics.skipped_days (база пускает только вчера/сегодня).
  async function skip(metricId: string) {
    const it = items.value.find((i) => i.metric.id === metricId)
    if (!it) return
    error.value = ''
    const day = fmtDate(addDays(new Date(), -1))
    const { error: err } = await sb.from('metrics').update({ skipped_days: withSkippedDay(it.metric, day) }).eq('id', metricId)
    if (err) {
      error.value = err.message
      return
    }
    remove(metricId)
    notifyDataChanged({ source: 'skip', metricId, date: day }) // серии, кольца и баллы пересчитываются
  }

  function keep(metricId: string) {
    remove(metricId)
  }

  function remove(metricId: string) {
    items.value = items.value.filter((i) => i.metric.id !== metricId)
    if (items.value.length === 0) visible.value = false
  }

  function close() {
    visible.value = false
  }

  return { items, visible, error, load, skip, keep, close }
}

function readShown(): string | null {
  try {
    return localStorage.getItem(SKIP_SHOWN_KEY)
  } catch {
    return null
  }
}

function markShown(day: string) {
  try {
    localStorage.setItem(SKIP_SHOWN_KEY, day)
  } catch {
    /* приватный режим — окно может показаться снова после перезагрузки, это не страшно */
  }
}
