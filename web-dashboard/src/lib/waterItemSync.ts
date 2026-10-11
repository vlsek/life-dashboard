import { sb } from './supabase'
import { parseWaterItem, readCachedWaterItem, writeCachedWaterItem } from './waterAnim'

// Надетая платная анимация воды (BACKLOG 54.9): применяется сразу из кэша устройства (`site_water_anim`), затем сверяемся с профилем —
// предмет мог быть надет на другом устройстве. Нет сети/колонки — остаётся кэш. Копия в web-header и web-dashboard (менять ВМЕСТЕ).
export async function syncWaterItem(userId: string): Promise<void> {
  try {
    const res = await sb.from('profiles').select('customization').eq('user_id', userId).maybeSingle()
    if (res.error || !res.data) return
    const item = parseWaterItem(((res.data as { customization?: Record<string, unknown> | null }).customization ?? {}).water_anim)
    if (item !== readCachedWaterItem()) writeCachedWaterItem(item)
  } catch {
    /* остаётся кэш */
  }
}
