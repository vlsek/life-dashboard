import { sb } from './supabase'
import { getLang } from './i18n'

// Сводка по другу в окне профиля (BACKLOG 41 «8:51»; миграция 056 `get_friend_summary`). Данные приходят ОДНИМ объектом из функции
// security definer: только для друзей и для себя; у скрытого из сообщества человека — имя, аватар и даты (hidden = true), без статистики.
export interface FriendSummary {
  user_id: string
  display_name: string
  avatar_url: string | null
  registered_at: string | null
  friends_since: string | null
  hidden: boolean
  points_total?: number
  points_week?: number
  perfect_streak?: number
  goals_done?: number
  active_days_30?: number
  favorite_exercise?: string | null
  badges_count?: number
  badges?: { key: string; unlocked_at: string | null }[]
  frame?: string | null
}

export type FriendSummaryResult = { status: 'ok'; data: FriendSummary } | { status: 'unsupported' } | { status: 'error'; error: unknown }

// Функции нет (миграция 056 не применена): PostgREST — PGRST202 / «Could not find the function», Postgres — 42883.
export function isMissingFunction(err: unknown): boolean {
  const e = err as { code?: string; message?: string } | null
  if (!e) return false
  return e.code === 'PGRST202' || e.code === '42883' || /could not find the function/i.test(e.message || '')
}

const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : undefined)

// Разбор ответа: лишнее и мусор отбрасываем, числа приводим к number (bigint из Postgres может прийти строкой).
export function parseFriendSummary(raw: unknown): FriendSummary | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.user_id !== 'string') return null
  const badges = Array.isArray(r.badges)
    ? (r.badges as Record<string, unknown>[]).filter((b) => b && typeof b.key === 'string').map((b) => ({ key: b.key as string, unlocked_at: typeof b.unlocked_at === 'string' ? b.unlocked_at : null }))
    : undefined
  return {
    user_id: r.user_id,
    display_name: typeof r.display_name === 'string' ? r.display_name : '',
    avatar_url: typeof r.avatar_url === 'string' ? r.avatar_url : null,
    registered_at: typeof r.registered_at === 'string' ? r.registered_at : null,
    friends_since: typeof r.friends_since === 'string' ? r.friends_since : null,
    hidden: r.hidden === true,
    points_total: num(r.points_total),
    points_week: num(r.points_week),
    perfect_streak: num(r.perfect_streak),
    goals_done: num(r.goals_done),
    active_days_30: num(r.active_days_30),
    favorite_exercise: typeof r.favorite_exercise === 'string' && r.favorite_exercise ? r.favorite_exercise : null,
    badges_count: num(r.badges_count),
    badges,
    frame: typeof r.frame === 'string' && r.frame ? r.frame : null,
  }
}

export async function fetchFriendSummary(friendId: string): Promise<FriendSummaryResult> {
  const { data, error } = await sb.rpc('get_friend_summary', { friend: friendId })
  if (error) return isMissingFunction(error) ? { status: 'unsupported' } : { status: 'error', error }
  const parsed = parseFriendSummary(data)
  return parsed ? { status: 'ok', data: parsed } : { status: 'error', error: new Error('bad summary') }
}

// «12 сентября 2026» / «September 12, 2026»; мусор → пустая строка
export function fmtSummaryDate(iso: string | null | undefined, lang: 'en' | 'ru' = getLang()): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat(lang === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' }).format(d)
}

// Сколько целых дней с даты (для «с нами N дн.»); будущее/мусор → null
export function daysSince(iso: string | null | undefined, now: Date = new Date()): number | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const n = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
  return n >= 0 ? n : null
}
