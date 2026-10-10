import { ref } from 'vue'
import { sb } from './supabase'
import { parseWeekGauge, readCachedWeekGauge, writeCachedWeekGauge, type WeekGaugeStyle } from './weekGauge'

// Вид спидометра недели (BACKLOG 53.2): сразу из кэша устройства (без мигания), затем сверяемся с профилем — выбор мог быть сделан на другом устройстве
// или в «Кастомизации» в другой вкладке. Нет сети/колонки — остаётся кэш.
export const weekGaugeStyle = ref<WeekGaugeStyle>(readCachedWeekGauge())

export async function syncWeekGauge(userId: string): Promise<void> {
  try {
    const res = await sb.from('profiles').select('customization').eq('user_id', userId).maybeSingle()
    if (res.error || !res.data) return
    const style = parseWeekGauge(((res.data as { customization?: Record<string, unknown> | null }).customization ?? {}).week_gauge)
    writeCachedWeekGauge(style)
    weekGaugeStyle.value = style
  } catch {
    /* остаётся кэш */
  }
}
