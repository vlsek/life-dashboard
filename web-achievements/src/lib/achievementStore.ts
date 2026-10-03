// Хранение открытых достижений: таблица user_achievements (migrations/039), а пока миграция не применена — localStorage устройства.
// Ничего не ломается ни в одном из режимов; когда миграцию применили, записи с устройства переезжают в таблицу при следующем заходе.
import { sb } from './supabase'
import type { Unlocked } from './achievements'

export type StorageMode = 'db' | 'local'

const LS_KEY = 'achievements_unlocked_v1'

function lsRead(userId: string): Unlocked {
  try {
    const all = JSON.parse(localStorage.getItem(LS_KEY) || '{}')
    const mine = all?.[userId]
    return mine && typeof mine === 'object' ? (mine as Unlocked) : {}
  } catch {
    return {}
  }
}

function lsWrite(userId: string, unlocked: Unlocked) {
  try {
    const all = JSON.parse(localStorage.getItem(LS_KEY) || '{}')
    localStorage.setItem(LS_KEY, JSON.stringify({ ...all, [userId]: unlocked }))
  } catch {
    // хранилище недоступно (приватный режим и т.п.) — достижения просто пересчитаются при следующем заходе
  }
}

// Нет таблицы (миграция не применена) — это штатный случай, а не ошибка пользователя.
export function isMissingTable(message: string | undefined | null): boolean {
  return !!message && /user_achievements|relation|schema cache|does not exist/i.test(message)
}

export interface LoadedUnlocked {
  stored: Unlocked // то, что считаем уже известным (таблица + записи устройства)
  mode: StorageMode
  backfill: Unlocked // записи, которые есть на устройстве, но ещё не в таблице: их надо дописать
}

export async function loadUnlocked(userId: string): Promise<LoadedUnlocked> {
  const local = lsRead(userId)
  const { data, error } = await sb.from('user_achievements').select('key, unlocked_at').eq('user_id', userId)
  if (error) {
    // нет таблицы — работаем на устройстве; любая другая ошибка — тоже не роняем страницу, но и в таблицу не пишем
    return { stored: local, mode: 'local', backfill: {} }
  }
  const db: Unlocked = {}
  for (const r of (data || []) as { key: string; unlocked_at: string | null }[]) db[r.key] = r.unlocked_at
  const backfill: Unlocked = {}
  for (const [k, v] of Object.entries(local)) if (!(k in db)) backfill[k] = v
  return { stored: { ...local, ...db }, mode: 'db', backfill }
}

// Дописывает ТОЛЬКО новое. Существующие строки не перезаписываются (ignoreDuplicates): дата открытия не должна меняться.
// Возвращает режим, в котором реально сохранили (если запись в таблицу не прошла — откатываемся на устройство).
export async function saveUnlocked(userId: string, mode: StorageMode, toWrite: Unlocked, full: Unlocked): Promise<StorageMode> {
  const keys = Object.keys(toWrite)
  if (!keys.length) return mode
  if (mode === 'db') {
    const rows = keys.map((key) => ({ user_id: userId, key, unlocked_at: toWrite[key] }))
    const { error } = await sb.from('user_achievements').upsert(rows, { onConflict: 'user_id,key', ignoreDuplicates: true })
    if (!error) return 'db'
  }
  lsWrite(userId, full)
  return 'local'
}
