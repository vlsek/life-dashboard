import { sb } from './supabase'
import { THEME_KEYS, setMotionOff, setSidebarProgress, setTheme, type ThemeKey } from './prefs'

// BACKLOG 48.3, срез 1: настройки оформления между устройствами. Раньше тема, язык и т. п. жили только в localStorage — на втором устройстве всё
// заново. Теперь копия лежит в profiles.ui_settings (миграция 064). Страницы пилотов не меняются: шапка (она на каждой странице) при загрузке
// сравнивает три значения по каждому ключу — локальное, серверное и «запомненное при прошлой синхронизации» — и решает, куда копировать:
//   • локально == на сервере → ничего;
//   • локально изменено после прошлой синхронизации → на сервер («изменил здесь»; при изменении и там, и тут побеждает это устройство);
//   • изменено только на сервере → на устройство;
//   • устройство ещё не синхронизировалось: на сервере есть значение → берём серверное («новое устройство получает настройки аккаунта»),
//     на сервере пусто, а локально есть → отправляем.
// Нет миграции / нет сети — тихо ничего не делаем (настройки остаются на устройстве).
export const SYNC_KEYS = [
  'site_theme', // оформление
  'site_lang', // язык
  'site_motion', // выключатель анимаций ('off')
  'sidebar_progress', // прогресс дня/недели в левом меню
  'streak_celebrations_off', // поздравления за серии
  'skip_prompt_off', // окно «вчерашние невыполненные»
  'water_reminders_off', // напоминание про воду
  'favorite_themes', // избранные темы (JSON)
  'day_progress_settings', // что считать в кольцах дня/недели (JSON)
] as const
export type SyncKey = (typeof SYNC_KEYS)[number]
export type Snapshot = Partial<Record<string, string | null>>

export interface SyncPlan {
  pull: Record<string, string | null> // что записать на устройство
  push: Record<string, string | null> // что записать на сервер
  synced: Record<string, string | null> // новое «запомненное при синхронизации»
}

// Чистая логика (тестируется отдельно): три значения по каждому ключу → что куда копировать.
export function planSync(keys: readonly string[], local: Snapshot, server: Snapshot, synced: Snapshot | null): SyncPlan {
  const plan: SyncPlan = { pull: {}, push: {}, synced: {} }
  for (const k of keys) {
    const l = local[k] ?? null
    const s = server[k] ?? null
    const known = synced && k in synced ? (synced[k] ?? null) : undefined // undefined — ключ ещё не синхронизировался
    if (l === s) {
      plan.synced[k] = l
    } else if (known !== undefined && l !== known) {
      plan.push[k] = l
      plan.synced[k] = l
    } else if (known !== undefined) {
      plan.pull[k] = s
      plan.synced[k] = s
    } else if (s !== null) {
      plan.pull[k] = s
      plan.synced[k] = s
    } else {
      plan.push[k] = l
      plan.synced[k] = l
    }
  }
  return plan
}

function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function writeLocal(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    /* приватный режим */
  }
}
const syncedKey = (uid: string) => 'ui_settings_synced:' + uid

// Применяет принятые с сервера значения. Тема/анимации/меню — через общие функции (сразу меняют вид); язык — перезагрузка (один раз: после неё значения совпадают).
export function applyPulled(pull: Record<string, string | null>): { reload: boolean } {
  let reload = false
  for (const [k, v] of Object.entries(pull)) {
    if (k === 'site_theme') {
      if (v && v in THEME_KEYS) setTheme(v as ThemeKey)
    } else if (k === 'site_motion') setMotionOff(v === 'off')
    else if (k === 'sidebar_progress') setSidebarProgress(v === '1')
    else if (k === 'site_lang') {
      if (v === 'ru' || v === 'en') {
        writeLocal(k, v)
        reload = true
      }
    } else writeLocal(k, v)
  }
  return { reload }
}

// Вызывается шапкой при загрузке страницы. Любой сбой молча игнорируется.
export async function syncUiSettings(userId: string, reload: () => void = () => location.reload()): Promise<void> {
  try {
    const res = await sb.from('profiles').select('ui_settings').eq('user_id', userId).maybeSingle()
    if (res.error || !res.data) return // нет колонки (миграция 064 не применена) или профиля
    const serverRaw = ((res.data as { ui_settings?: unknown }).ui_settings ?? {}) as Snapshot
    const server: Snapshot = typeof serverRaw === 'object' && serverRaw ? serverRaw : {}
    const local: Snapshot = {}
    for (const k of SYNC_KEYS) local[k] = readLocal(k)
    let synced: Snapshot | null = null
    try {
      synced = JSON.parse(readLocal(syncedKey(userId)) || 'null')
    } catch {
      synced = null
    }
    const plan = planSync(SYNC_KEYS, local, server, synced)
    if (Object.keys(plan.push).length) {
      const merged = { ...server, ...plan.push }
      const up = await sb.from('profiles').update({ ui_settings: merged }).eq('user_id', userId)
      if (up.error) {
        // не записалось — «запомненное» не двигаем для отправляемых ключей, попробуем при следующей загрузке
        for (const k of Object.keys(plan.push)) {
          if (synced && k in synced) plan.synced[k] = synced[k] ?? null
          else delete plan.synced[k]
        }
      }
    }
    writeLocal(syncedKey(userId), JSON.stringify(plan.synced))
    if (Object.keys(plan.pull).length) {
      const { reload: needReload } = applyPulled(plan.pull)
      if (needReload) reload()
    }
  } catch {
    /* оставляем всё как есть */
  }
}
