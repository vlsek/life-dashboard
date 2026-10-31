// Есть ли в базе таблица сессий (миграция 113). Нет — «Завершить» пишет записи старого формата (BACKLOG 69.2).
// «Таблицы нет» запоминаем на время вкладки; сбой сети не запоминаем (ответ «не знаю» = пишем по-старому, данные остаются валидными).
import { sb } from './supabase'

export const tableMissing = (e: { code?: string; message?: string } | null | undefined): boolean =>
  !!e && (e.code === 'PGRST205' || e.code === '42P01' || /schema cache|does not exist/i.test(e.message ?? ''))

let known: boolean | null = null
export async function sessionsAvailable(): Promise<boolean> {
  if (known !== null) return known
  try {
    const r = await sb.from('workout_sessions').select('id').limit(1)
    if (!r.error) return (known = true)
    if (tableMissing(r.error)) return (known = false)
    return false
  } catch {
    return false
  }
}
export const resetSessionProbe = (): void => { known = null } // для тестов
