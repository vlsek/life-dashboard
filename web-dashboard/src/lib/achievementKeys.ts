import { sb } from './supabase'

// Выдача достижений «Идеальные дни» прямо с Дашборда (BACKLOG раздел 36): тот же формат хранения, что у страницы «Достижения»
// (web-achievements/src/lib/achievementStore.ts — КОПИЯ нужных функций): таблица user_achievements (migrations/039), а пока её нет —
// localStorage устройства. Существующие записи НЕ перезаписываются (дата открытия не меняется), страница «Достижения» подхватит
// выданное здесь и не станет поздравлять второй раз (ключ уже в хранилище).
export type StorageMode = 'db' | 'local'
type Unlocked = Record<string, string | null>

const LS_KEY = 'achievements_unlocked_v1'

function lsAll(): Record<string, Unlocked> {
  try {
    const all = JSON.parse(localStorage.getItem(LS_KEY) || '{}')
    return all && typeof all === 'object' && !Array.isArray(all) ? all : {}
  } catch {
    return {}
  }
}
const lsRead = (userId: string): Unlocked => {
  const mine = lsAll()[userId]
  return mine && typeof mine === 'object' ? mine : {}
}

function lsWrite(userId: string, unlocked: Unlocked) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ ...lsAll(), [userId]: unlocked }))
  } catch {
    // хранилище недоступно — страница «Достижения» пересчитает при следующем заходе
  }
}

export interface LoadedKeys {
  keys: Set<string> // что уже открыто (таблица + устройство)
  mode: StorageMode
}

export async function loadUnlockedKeys(userId: string): Promise<LoadedKeys> {
  const local = lsRead(userId)
  const { data, error } = await sb.from('user_achievements').select('key').eq('user_id', userId)
  if (error) return { keys: new Set(Object.keys(local)), mode: 'local' }
  const keys = new Set<string>([...Object.keys(local), ...((data || []) as { key: string }[]).map((r) => r.key)])
  return { keys, mode: 'db' }
}

// Дописывает только новое; если запись в таблицу не прошла — кладёт на устройство (как страница «Достижения»)
export async function saveUnlockedKeys(userId: string, mode: StorageMode, newKeys: string[], nowIso: string): Promise<StorageMode> {
  if (!newKeys.length) return mode
  if (mode === 'db') {
    const rows = newKeys.map((key) => ({ user_id: userId, key, unlocked_at: nowIso }))
    const { error } = await sb.from('user_achievements').upsert(rows, { onConflict: 'user_id,key', ignoreDuplicates: true })
    if (!error) return 'db'
  }
  const mine = lsRead(userId)
  for (const k of newKeys) if (!(k in mine)) mine[k] = nowIso
  lsWrite(userId, mine)
  return 'local'
}
