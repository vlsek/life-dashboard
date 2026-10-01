import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { sb } from './supabase'
import { todayStr } from './date'
import { DATA_CHANGED } from './events'
import { remainingMetricsToday, shouldShowEveningReminder } from './evening'
import { withWaterGoal } from './waterGoal'
import type { Metric, MetricValue } from './types'

export const EVENING_DISMISS_KEY = 'evening_reminder_dismissed'

export interface EveningItem {
  metric: Metric
  value: MetricValue
}

// Отдельный composable со своим небольшим запросом (активные метрики + значения только за
// сегодня), а не часть useDashboard.ts — по принципу остальных блоков (см. useReminders.ts):
// чужие файлы не трогаем, мержевых конфликтов меньше. Перечитывает данные на DATA_CHANGED
// (человек отметил метрику — плашка сразу исчезает или короче), а «наступил вечер» ловит
// таймером раз в минуту, чтобы плашка появилась в 21:00 без перезагрузки страницы.
export function useEveningReminder() {
  const items = ref<EveningItem[]>([])
  const now = ref(new Date())
  const dismissedOn = ref<string | null>(readDismissed())

  const visible = computed(() => shouldShowEveningReminder(now.value, items.value.length, dismissedOn.value, todayStr()))

  let userId = ''
  let loadToken = 0 // ответ на устаревший запрос (быстро отметили несколько метрик) не применяем

  async function load(uid?: string) {
    if (uid) userId = uid
    if (!userId) return
    const token = ++loadToken
    const today = todayStr()
    const [metricsRes, valuesRes] = await Promise.all([
      sb.from('metrics').select('*').eq('user_id', userId).eq('active', true).order('position'),
      sb.from('daily_values').select('metric_id, value').eq('user_id', userId).eq('date', today),
    ])
    if (token !== loadToken) return
    if (metricsRes.error || valuesRes.error) return // напоминание — вспомогательное: молча ничего не показываем
    const values: Record<string, MetricValue> = {}
    for (const v of (valuesRes.data || []) as { metric_id: string; value: MetricValue }[]) values[v.metric_id] = v.value
    const metricList = await withWaterGoal(userId, (metricsRes.data || []) as Metric[])
    if (token !== loadToken) return
    items.value = remainingMetricsToday(metricList, values, today).map((metric) => ({
      metric,
      value: values[metric.id],
    }))
  }

  function onDataChanged() {
    void load()
  }

  let timer: ReturnType<typeof setInterval> | undefined
  onMounted(() => {
    window.addEventListener(DATA_CHANGED, onDataChanged)
    timer = setInterval(() => {
      now.value = new Date()
    }, 60_000)
  })
  onBeforeUnmount(() => {
    window.removeEventListener(DATA_CHANGED, onDataChanged)
    if (timer) clearInterval(timer)
  })

  function dismiss() {
    const today = todayStr()
    dismissedOn.value = today
    try {
      localStorage.setItem(EVENING_DISMISS_KEY, today)
    } catch {
      /* приватный режим — просто не запоминаем закрытие между перезагрузками */
    }
  }

  return { items, visible, load, dismiss }
}

function readDismissed(): string | null {
  try {
    return localStorage.getItem(EVENING_DISMISS_KEY)
  } catch {
    return null
  }
}
