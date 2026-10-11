import { ref } from 'vue'
import { sb } from './supabase'
import { parseWaterGlass, readCachedWaterGlass, writeCachedWaterGlass, type WaterGlassStyle } from './waterGlass'

// Вид стакана воды (BACKLOG 53.2): сразу из кэша устройства (без мигания), затем сверяемся с профилем — выбор мог быть сделан на другом устройстве
// или в «Кастомизации» в другой вкладке. Нет сети/колонки — остаётся кэш.
export const waterGlassStyle = ref<WaterGlassStyle>(readCachedWaterGlass())

export async function syncWaterGlass(userId: string): Promise<void> {
  try {
    const res = await sb.from('profiles').select('customization').eq('user_id', userId).maybeSingle()
    if (res.error || !res.data) return
    const style = parseWaterGlass(((res.data as { customization?: Record<string, unknown> | null }).customization ?? {}).water_glass)
    writeCachedWaterGlass(style)
    waterGlassStyle.value = style
  } catch {
    /* остаётся кэш */
  }
}
