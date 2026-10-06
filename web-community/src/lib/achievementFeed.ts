import { badgeDef } from './badges'
import { fmtDate, parseIso } from './date'
import type { FeedRow, Scope } from './types'

// Лента достижений в Сообществе (BACKLOG 395, решение владельца 2026-10-06): человек САМ выбирает, какие достижения отражать
// в ленте — не больше 5; все остальные видны в раскрытом публичном профиле. Здесь только чистая логика (без сети и DOM);
// данные — RPC get_achievement_feed (миграция 052), выбор хранится в profiles.feed_achievements.
export const FEED_MAX = 5

// Выбор для ленты → чистый список: только строки, известные реестру, без повторов, не больше FEED_MAX.
// Если передан набор открытых значков — оставляем только из него (нельзя выбрать то, чего нет).
export function normalizeFeedPick(raw: unknown, unlocked?: ReadonlySet<string>): string[] {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  for (const k of raw) {
    if (typeof k !== 'string' || out.includes(k) || !badgeDef(k)) continue
    if (unlocked && !unlocked.has(k)) continue
    out.push(k)
    if (out.length >= FEED_MAX) break
  }
  return out
}

export const canPickMore = (current: readonly string[]): boolean => current.length < FEED_MAX

// Переключить значок в выборе: есть — снять; нет — добавить, пока не достигнут максимум (иначе список не меняется).
export function togglePick(current: readonly string[], key: string): string[] {
  if (current.includes(key)) return current.filter((k) => k !== key)
  return canPickMore(current) ? [...current, key] : [...current]
}

// События для показа: неизвестные ключи (новое достижение, которого нет в копии реестра) не рисуем; «Только друзья» — друзья и я;
// новые сверху (при равенстве времени — порядок как пришёл).
export function feedRows(rows: FeedRow[], myId: string, scope: Scope, friendIds: ReadonlySet<string>, limit = 30): FeedRow[] {
  return rows
    .filter((r) => !!badgeDef(r.key) && !!r.unlocked_at)
    .filter((r) => scope === 'everyone' || r.user_id === myId || friendIds.has(r.user_id))
    .map((r, i) => ({ r, i, ts: Date.parse(r.unlocked_at) }))
    .filter((x) => Number.isFinite(x.ts))
    .sort((a, b) => b.ts - a.ts || a.i - b.i)
    .slice(0, limit)
    .map((x) => x.r)
}

// Когда: «сегодня» / «вчера» / «N дн. назад» по ЛОКАЛЬНЫМ датам (а не по 24-часовым окнам); время из будущего (сбой часов) — «сегодня».
export function feedAge(iso: string, now: Date = new Date()): { kind: 'today' | 'yesterday' | 'days'; days: number } {
  const then = new Date(iso)
  if (!Number.isFinite(then.getTime())) return { kind: 'today', days: 0 }
  const days = Math.round((parseIso(fmtDate(now)).getTime() - parseIso(fmtDate(then)).getTime()) / 86_400_000)
  if (days <= 0) return { kind: 'today', days: 0 }
  if (days === 1) return { kind: 'yesterday', days: 1 }
  return { kind: 'days', days }
}
