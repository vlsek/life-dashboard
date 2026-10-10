import { ref } from 'vue'
import { sb } from './supabase'
import { parseDayGauge, readCachedDayGauge, writeCachedDayGauge, type DayGaugeStyle } from './dayGauge'

// Вид спидометра дня (BACKLOG 53.2): сразу из кэша устройства (без мигания), затем сверяемся с профилем — выбор мог быть сделан на другом устройстве
// или в «Кастомизации» в другой вкладке. Нет сети/колонки — остаётся кэш.
export const dayGaugeStyle = ref<DayGaugeStyle>(readCachedDayGauge())

export async function syncDayGauge(userId: string): Promise<void> {
  try {
    const res = await sb.from('profiles').select('customization').eq('user_id', userId).maybeSingle()
    if (res.error || !res.data) return
    const style = parseDayGauge(((res.data as { customization?: Record<string, unknown> | null }).customization ?? {}).day_gauge)
    writeCachedDayGauge(style)
    dayGaugeStyle.value = style
  } catch {
    /* остаётся кэш */
  }
}
