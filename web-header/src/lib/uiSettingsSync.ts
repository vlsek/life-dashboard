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
  // ---- срез 2: расположение и вид (BACKLOG 48.3; ключи те же, что читают пилоты — пилоты не менялись)
  'favorite_pages', // избранные страницы в боковом меню (JSON)
  'goal_deadline_reminder_off', // напоминание о сроках целей выключено
  'community_tab', // «Сообщество»: последняя вкладка
  'community_category', // «Сообщество»: последняя категория сравнения
  'cust_tab', // «Кастомизация»: вкладка
  'cust_collapsed', // «Кастомизация»: свёрнутые разделы и группы (JSON)
  'cust_visibility', // «Кастомизация»: что показывать (JSON)
  'milestones_cat_filter', // «Вехи»: фильтр категории
  'shop_view', // «Магазин»: вид витрины
  'skills_sort', // «Навыки»: сортировка
  'vocab_lang_filter', // «Языки»: фильтр языка
  'vocab_tabs', // «Языки»: вкладки
  'workouts_tab', // «Тренировки»: вкладка
  'workouts_body_model', // «Тренировки»: модель тела (пол)
  'workouts_weight_unit', // «Тренировки»: единица веса
  'workouts_musclemap_open', // «Тренировки»: блок карты мышц раскрыт
  'workouts_musclemap_period', // «Тренировки»: период карты мышц
  'workouts_progressions_open', // «Тренировки»: блок прогрессий раскрыт
  'workouts_measurements_open', // «Тренировки»: блок замеров раскрыт
] as const
// Ключи с общим началом (на каждый блок / график / раздел / упражнение свой ключ): синхронизируются все найденные, но не больше MAX_KEYS_PER_PREFIX на начало
// (остальные остаются только на устройстве — чтобы запись в профиле не разрасталась). Одноразовые «закрыл подсказку» сюда не входят — они про устройство.
export const SYNC_PREFIXES = [
  'dash_collapsed:', // Дашборд: свёрнутые блоки
  'dash_period_chart:', // Дашборд: период каждого графика
  'goals_section_', // «Цели»: свёрнутые разделы
  'skills_section_', // «Навыки»: свёрнутые разделы
  'workouts_ex_collapsed:', // «Тренировки»: свёрнутые карточки упражнений
] as const
export const MAX_KEYS_PER_PREFIX = 60
export const MAX_VALUE_LEN = 2000 // длиннее — не синхронизируем (мусор/случайный большой JSON не должен раздувать профиль)
export type SyncKey = (typeof SYNC_KEYS)[number]
export type Snapshot = Partial<Record<string, string | null>>

export interface SyncPlan {
  pull: Record<string, string | null> // что записать на устройство
  push: Record<string, string | null> // что записать на сервер
  synced: Record<string, string | null> // новое «запомненное при синхронизации»
}

export function prefixOf(key: string): string | null {
  for (const p of SYNC_PREFIXES) if (key.startsWith(p) && key.length > p.length) return p
  return null
}

// Какие ключи сверять: все постоянные + найденные с известными началами (локально, на сервере и в «запомненном»), не больше MAX_KEYS_PER_PREFIX на начало
// (по алфавиту — набор детерминирован на всех устройствах).
export function collectKeys(localKeys: readonly string[], serverKeys: readonly string[], syncedKeys: readonly string[]): string[] {
  const byPrefix = new Map<string, Set<string>>()
  for (const k of [...localKeys, ...serverKeys, ...syncedKeys]) {
    const p = prefixOf(k)
    if (!p) continue
    if (!byPrefix.has(p)) byPrefix.set(p, new Set())
    byPrefix.get(p)!.add(k)
  }
  const out: string[] = [...SYNC_KEYS]
  for (const p of SYNC_PREFIXES) {
    const list = [...(byPrefix.get(p) ?? [])].sort().slice(0, MAX_KEYS_PER_PREFIX)
    out.push(...list)
  }
  return out
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
function allLocalKeys(): string[] {
  try {
    const out: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k) out.push(k)
    }
    return out
  } catch {
    return []
  }
}
// Одно значение серверного снимка → строка или null (серверный мусор вида число/объект/слишком длинное — как «нет значения»)
const asValue = (v: unknown): string | null => (typeof v === 'string' && v.length <= MAX_VALUE_LEN ? v : null)

// Перезагрузка после «подтягивания» не чаще раза в RELOAD_GUARD_MS за вкладку: если запись на устройство не удержалась (приватный режим и т. п.),
// страница не должна уходить в бесконечную перезагрузку. Нет sessionStorage — не перезагружаем вовсе.
const RELOAD_GUARD_KEY = 'ui_sync_reload_at'
const RELOAD_GUARD_MS = 30 * 1000
function reloadGuarded(reload: () => void) {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) || 0)
    if (Date.now() - last < RELOAD_GUARD_MS) return
    sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()))
  } catch {
    return
  }
  reload()
}

// Применяет принятые с сервера значения. Тема/анимации/меню — через общие функции (сразу меняют вид); язык — перезагрузка (один раз: после неё значения совпадают).
// Тема, анимации и меню применяются сразу (ветки ниже, перезагрузка не нужна); всё остальное (расположение, вкладки, свёрнутость) страница читает при загрузке —
// после «подтягивания» такого значения просим перезагрузку.
export function applyPulled(pull: Record<string, string | null>): { reload: boolean } {
  let reload = false
  for (const [k, v] of Object.entries(pull)) {
    if (k === 'site_theme') {
      if (v && v in THEME_KEYS) setTheme(v as ThemeKey)
    } else if (k === 'site_motion') setMotionOff(v === 'off')
    else if (k === 'sidebar_progress') setSidebarProgress(v === '1')
    else if (k === 'site_lang' && v !== 'ru' && v !== 'en') {
      /* чужое значение языка не принимаем */
    } else {
      const before = readLocal(k)
      writeLocal(k, v)
      // перезагрузка нужна, только если значение РЕАЛЬНО изменилось и записалось (иначе страница бы перезагружалась вхолостую)
      if (before !== v && readLocal(k) === v) reload = true
    }
  }
  return { reload }
}

// Вызывается шапкой при загрузке страницы. Любой сбой молча игнорируется.
export async function syncUiSettings(userId: string, reload: () => void = () => location.reload()): Promise<void> {
  try {
    const res = await sb.from('profiles').select('ui_settings').eq('user_id', userId).maybeSingle()
    if (res.error || !res.data) return // нет колонки (миграция 064 не применена) или профиля
    const serverRaw = ((res.data as { ui_settings?: unknown }).ui_settings ?? {}) as Record<string, unknown>
    const server: Snapshot = {}
    if (typeof serverRaw === 'object' && serverRaw) for (const [k, v] of Object.entries(serverRaw)) server[k] = asValue(v)
    let synced: Snapshot | null = null
    try {
      synced = JSON.parse(readLocal(syncedKey(userId)) || 'null')
    } catch {
      synced = null
    }
    const keys = collectKeys(allLocalKeys(), Object.keys(server), synced ? Object.keys(synced) : [])
    const local: Snapshot = {}
    for (const k of keys) local[k] = asValue(readLocal(k))
    const plan = planSync(keys, local, server, synced)
    if (Object.keys(plan.push).length) {
      // сброс настройки (null) стирает ключ на сервере, а не хранит пустое значение — запись в профиле не копит «мёртвые» ключи
      const merged: Snapshot = { ...server, ...plan.push }
      for (const k of Object.keys(merged)) if (merged[k] === null || merged[k] === undefined) delete merged[k]
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
      if (needReload) reloadGuarded(reload)
    }
  } catch {
    /* оставляем всё как есть */
  }
}
