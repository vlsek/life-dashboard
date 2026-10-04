import { sb } from './supabase'
import { normalizeProgram, readProgram, writeProgram, type ActiveProgram } from './program'

// Синхронизация активной программы между устройствами (BACKLOG 3.3; миграция 040: profiles.workout_program jsonb).
// Правила (как у «избранного», 035, плюс защита от «воскрешения»):
//  1) Колонки нет (миграция не применена, запрос вернул ошибку) — молча остаёмся на localStorage этого устройства.
//  2) В профиле есть программа — она главная: пишем её в localStorage.
//  3) В профиле пусто, а на устройстве есть программа:
//       • устройство ещё ни разу не синхронизировалось (флаг не стоит) — один раз загружаем её в профиль;
//       • флаг стоит — пусто в профиле значит «завершили на другом устройстве»: локальную убираем, иначе она воскресла бы.
const SYNCED_KEY = 'workout_program_synced'

function isSynced(): boolean {
  try {
    return localStorage.getItem(SYNCED_KEY) === '1'
  } catch {
    return false
  }
}
function markSynced(): void {
  try {
    localStorage.setItem(SYNCED_KEY, '1')
  } catch {
    /* ignore */
  }
}

export async function syncProgramFromProfile(userId: string): Promise<ActiveProgram | null> {
  const local = readProgram()
  const { data, error } = await sb.from('profiles').select('workout_program').eq('user_id', userId).maybeSingle()
  if (error) return local
  const remote = normalizeProgram((data as { workout_program?: unknown } | null)?.workout_program)
  if (remote) {
    if (JSON.stringify(remote) !== JSON.stringify(local)) writeProgram(remote)
    markSynced()
    return remote
  }
  if (local && !isSynced()) {
    if (await saveProgramToProfile(userId, local)) markSynced()
    return local
  }
  if (local) writeProgram(null)
  markSynced()
  return null
}

export async function saveProgramToProfile(userId: string, program: ActiveProgram | null): Promise<boolean> {
  const { error } = await sb.from('profiles').upsert({ user_id: userId, workout_program: program ? normalizeProgram(program) : null })
  if (!error) markSynced()
  return !error
}
