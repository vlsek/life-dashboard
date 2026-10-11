import { sb } from './supabase'

// «Показывать друзьям, что я в сети» (BACKLOG 48.2): profiles.show_online, по умолчанию true. Читаем при открытии настроек.
// Колонки ещё нет (миграция 069 не применена) или сбой сети — считаем «включено» (как и по умолчанию) и не ломаем окно.
export async function loadShowOnline(userId: string): Promise<boolean> {
  try {
    const { data, error } = await sb.from('profiles').select('show_online').eq('user_id', userId).maybeSingle()
    if (error) return true
    const v = (data as { show_online?: boolean | null } | null)?.show_online
    return typeof v === 'boolean' ? v : true
  } catch {
    return true
  }
}

export type SaveShowOnlineResult = { ok: true } | { ok: false; error: unknown }

export async function saveShowOnline(userId: string, value: boolean): Promise<SaveShowOnlineResult> {
  const { error } = await sb.from('profiles').upsert({ user_id: userId, show_online: value })
  return error ? { ok: false, error } : { ok: true }
}
