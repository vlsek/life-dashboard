import { sb } from './supabase'
import { t } from './i18n'

// «В сети» / «был(а) N назад» у друга (BACKLOG 48.2; миграция 069 `get_friends_presence`). Сервер отдаёт отметки только друзей,
// которые не скрыли показ; чужих/скрытых в ответе просто нет — подпись не показывается. Не применена миграция / сбой — пустая карта.
export const ONLINE_WINDOW_MS = 5 * 60 * 1000

export interface PresenceLabel {
  online: boolean
  text: string
}

export async function loadFriendsPresence(): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  try {
    const { data, error } = await sb.rpc('get_friends_presence')
    if (error || !Array.isArray(data)) return out
    for (const r of data as { user_id?: string; last_seen_at?: string }[]) {
      if (typeof r.user_id === 'string' && typeof r.last_seen_at === 'string') out.set(r.user_id, r.last_seen_at)
    }
  } catch {
    /* нет сети — без подписи */
  }
  return out
}

// Подпись по отметке: меньше 5 минут — «в сети»; дальше «был(а) в сети N мин / ч / дн назад»; нет/не дата/из будущего — null (молчим)
export function presenceLabel(lastSeenIso: string | null | undefined, now: Date): PresenceLabel | null {
  const ts = lastSeenIso ? Date.parse(lastSeenIso) : NaN
  if (!Number.isFinite(ts)) return null
  const ago = now.getTime() - ts
  if (ago < -5 * 60 * 1000) return null // часы устройства сильно расходятся с сервером — не гадаем
  if (ago < ONLINE_WINDOW_MS) return { online: true, text: t('comm_presence_online') }
  const min = Math.floor(ago / 60000)
  if (min < 60) return { online: false, text: t('comm_presence_min').replace('{n}', String(min)) }
  const hours = Math.floor(min / 60)
  if (hours < 24) return { online: false, text: t('comm_presence_hours').replace('{n}', String(hours)) }
  const days = Math.floor(hours / 24)
  return { online: false, text: t('comm_presence_days').replace('{n}', String(days)) }
}
