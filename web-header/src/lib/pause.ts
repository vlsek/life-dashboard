import { sb } from './supabase'
import { addDaysIso, todayStr } from './date'

// Режим «отпуск / болезнь» (BACKLOG 48.7, миграция 070): серии и недельный прогресс на паузе. Решения владельца (2026-10-11): задним числом
// нельзя, не дольше 30 дней, замораживает и недельный прогресс. Сервер (start_pause/end_pause) дописывает даты паузы в `metrics.skipped_days`,
// поэтому серии и «ожидаемые» метрики на всех страницах учитывают паузу сами; здесь — только чтение журнала и вызовы функций.
export type PauseKind = 'vacation' | 'illness'
export const MAX_PAUSE_DAYS = 30

export interface PauseRow {
  id: string
  kind: PauseKind
  from_date: string
  to_date: string
}

export type PauseState =
  | { status: 'active'; row: PauseRow; daysLeft: number } // сегодня внутри паузы; daysLeft считает и сегодняшний день
  | { status: 'scheduled'; row: PauseRow; daysLeft: number } // начнётся позже
  | null

const dayDiff = (from: string, to: string) => Math.round((Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / 86_400_000)

// Состояние по журналу: берём пауза, которая ещё не закончилась (to_date >= сегодня); прошедшие в расчёт не идут.
export function pauseState(rows: readonly PauseRow[], today: string): PauseState {
  const live = rows.filter((r) => r.to_date >= today).sort((a, b) => (a.to_date < b.to_date ? 1 : -1))[0]
  if (!live) return null
  const daysLeft = dayDiff(live.from_date <= today ? today : live.from_date, live.to_date) + 1
  return { status: live.from_date <= today ? 'active' : 'scheduled', row: live, daysLeft }
}

// Последний допустимый день паузы, начатой в `from` (не больше 30 дней включительно).
export function maxPauseTo(from: string): string {
  return addDaysIso(from, MAX_PAUSE_DAYS - 1)
}

// Проверка ввода до похода на сервер; возвращает ключ ошибки (для i18n) или null.
export function validatePause(to: string, today: string): 'hdr_pause_err_empty' | 'hdr_pause_err_past' | 'hdr_pause_err_long' | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(to)) return 'hdr_pause_err_empty'
  if (to < today) return 'hdr_pause_err_past'
  if (to > maxPauseTo(today)) return 'hdr_pause_err_long'
  return null
}

// Ошибка сервера → ключ текста; всё прочее — обычное «не получилось сохранить».
export function pauseErrorKey(err: unknown): string | null {
  const msg = String((err as { message?: unknown } | null)?.message ?? err ?? '')
  const m = msg.match(/pause_backdated|pause_too_long|pause_already_set|pause_bad_range|pause_too_far|bad_pause_kind/)
  if (!m) return null
  return ({ pause_backdated: 'hdr_pause_err_past', pause_too_long: 'hdr_pause_err_long', pause_already_set: 'hdr_pause_err_exists', pause_bad_range: 'hdr_pause_err_past', pause_too_far: 'hdr_pause_err_long', bad_pause_kind: 'hdr_pause_err_empty' } as Record<string, string>)[m[0]]
}

// Журнал пауз. null — таблицы ещё нет (миграция 070 не применена): раздел и значок просто не показываем.
export async function loadPauses(userId: string): Promise<PauseRow[] | null> {
  try {
    const { data, error } = await sb.from('streak_pauses').select('id, kind, from_date, to_date').eq('user_id', userId).order('to_date', { ascending: false }).limit(5)
    if (error) return null
    return (data || []) as PauseRow[]
  } catch {
    return null
  }
}

export async function loadPauseState(userId: string): Promise<{ available: boolean; state: PauseState }> {
  const rows = await loadPauses(userId)
  return rows ? { available: true, state: pauseState(rows, todayStr()) } : { available: false, state: null }
}

export async function startPause(kind: PauseKind, to: string): Promise<{ ok: true } | { ok: false; error: unknown }> {
  const { error } = await sb.rpc('start_pause', { p_kind: kind, p_to: to })
  return error ? { ok: false, error } : { ok: true }
}

export async function endPause(): Promise<{ ok: true } | { ok: false; error: unknown }> {
  const { error } = await sb.rpc('end_pause')
  return error ? { ok: false, error } : { ok: true }
}
