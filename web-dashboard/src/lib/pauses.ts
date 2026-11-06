import { ref } from 'vue'
import { sb } from './supabase'
import { addDays, fmtDate, todayStr } from './date'

// BACKLOG 81.5 «Отпуск / больничный без потери стрика». Пауза — диапазон дат (или «до отмены»): в эти дни невыполнение метрик и пустая заметка
// серию не рвут и не считаются; если в день паузы всё же выполнено — засчитывается как обычно. Наград за паузу нет. Хранение: profiles.pauses
// (миграция 119) + localStorage как запасной слой. Недельные серии («N раз в неделю») паузу пока не учитывают.
export type PauseKind = 'vacation' | 'sick'
export interface Pause {
  from: string
  to: string | null
  kind: PauseKind
}
export const PAUSES_KEY = 'streak_pauses'
export const MAX_PAUSES = 50
export const BACKDATE_DAYS = 7 // задним числом — не глубже недели: пауза для честного «был болен вчера», а не для переписывания года

const ISO = /^\d{4}-\d{2}-\d{2}$/
function validDate(s: unknown): s is string {
  if (typeof s !== 'string' || !ISO.test(s)) return false
  const d = new Date(s + 'T00:00:00')
  return !Number.isNaN(d.getTime()) && fmtDate(d) === s
}

// Только корректные записи; to < from отбрасываем; порядок по from; не больше MAX_PAUSES (остаются последние).
export function normalizePauses(raw: unknown): Pause[] {
  if (!Array.isArray(raw)) return []
  const out: Pause[] = []
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue
    const { from, to, kind } = r as Record<string, unknown>
    if (!validDate(from)) continue
    if (to !== null && to !== undefined && !validDate(to)) continue
    const end = (to ?? null) as string | null
    if (end !== null && end < from) continue
    out.push({ from, to: end, kind: kind === 'sick' ? 'sick' : 'vacation' })
  }
  out.sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0))
  return out.slice(-MAX_PAUSES)
}

export function isPausedOn(pauses: readonly Pause[], day: string): boolean {
  return pauses.some((p) => p.from <= day && (p.to === null || day <= p.to))
}

// Идёт ли пауза сегодня и какая именно (для плашки «пауза до …»).
export function activePause(pauses: readonly Pause[], today: string): Pause | null {
  return pauses.find((p) => p.from <= today && (p.to === null || today <= p.to)) ?? null
}

// Можно ли добавить диапазон: даты корректны, to >= from, начало не глубже BACKDATE_DAYS дней назад.
export function canAddPause(p: Pause, today: string): boolean {
  if (!validDate(p.from) || (p.to !== null && !validDate(p.to))) return false
  if (p.to !== null && p.to < p.from) return false
  return p.from >= fmtDate(addDays(new Date(today + 'T00:00:00'), -BACKDATE_DAYS))
}

function readLocal(): Pause[] {
  try {
    return normalizePauses(JSON.parse(localStorage.getItem(PAUSES_KEY) || 'null'))
  } catch {
    return []
  }
}
function writeLocal(p: Pause[]): void {
  try {
    localStorage.setItem(PAUSES_KEY, JSON.stringify(p))
  } catch {
    /* хранилище недоступно — пауза не сохранится на устройстве */
  }
}

export const pauses = ref<Pause[]>(readLocal())
let uid: string | null = null
let syncedFor: string | null = null // паузу тянем из профиля один раз за сессию: refresh дашборда идёт часто

export async function savePausesToProfile(userId: string, p: Pause[]): Promise<boolean> {
  const { error } = await sb.from('profiles').upsert({ user_id: userId, pauses: p })
  return !error
}

// Как у целей мышц: колонки нет — остаёмся на устройстве; в профиле массив (даже пустой) — он главный; null, а на устройстве паузы есть — один раз загружаем.
export async function syncPausesFromProfile(userId: string): Promise<Pause[]> {
  uid = userId
  if (syncedFor === userId) return pauses.value
  const { data, error } = await sb.from('profiles').select('pauses').eq('user_id', userId).maybeSingle()
  if (error) return pauses.value
  syncedFor = userId
  const raw = (data as { pauses?: unknown } | null)?.pauses
  if (Array.isArray(raw)) {
    pauses.value = normalizePauses(raw)
    writeLocal(pauses.value)
  } else if (pauses.value.length) {
    void savePausesToProfile(userId, pauses.value)
  }
  return pauses.value
}

function commit(next: Pause[]): void {
  pauses.value = next
  writeLocal(next)
  if (uid) void savePausesToProfile(uid, next)
}

// только для тестов
export function _resetPausesSync(): void {
  syncedFor = null
  uid = null
}

export function addPause(p: Pause, today: string = todayStr()): boolean {
  if (!canAddPause(p, today)) return false
  commit(normalizePauses([...pauses.value, p]))
  return true
}

// Закончить идущую паузу сегодня (to = сегодня) — день окончания входит в паузу.
export function endPauseToday(today: string = todayStr()): void {
  commit(normalizePauses(pauses.value.map((p) => (p.from <= today && (p.to === null || p.to > today) ? { ...p, to: today } : p))))
}

export function removePause(index: number): void {
  commit(pauses.value.filter((_, i) => i !== index))
}
