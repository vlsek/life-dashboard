import type { FriendRequestRow } from './types'

// RPC get_friend_ids возвращает `setof uuid` — PostgREST отдаёт массив строк. На случай, если
// клиент обернёт значение в объект ({ get_friend_ids: id }), берём его первое поле.
export function toAcceptedIdSet(raw: unknown): Set<string> {
  if (!Array.isArray(raw)) return new Set()
  const ids: string[] = []
  for (const x of raw) {
    const id = x !== null && typeof x === 'object' ? Object.values(x as Record<string, unknown>)[0] : x
    if (typeof id === 'string' && id) ids.push(id)
  }
  return new Set(ids)
}

// Фильтр «Только друзья» = принятые друзья ∪ подписки (follows остаются как есть).
export function mergeFriendScope(follows: Set<string>, accepted: Set<string>): Set<string> {
  return new Set([...follows, ...accepted])
}

export function splitRequests(rows: FriendRequestRow[]): { incoming: FriendRequestRow[]; outgoing: FriendRequestRow[] } {
  return {
    incoming: rows.filter((r) => r.direction === 'incoming'),
    outgoing: rows.filter((r) => r.direction === 'outgoing'),
  }
}

// Что случилось после send_friend_request: сервер сразу принимает встречную заявку
// (вернёт status = 'accepted'), иначе заявка просто отправлена. 'already' — уже друзья
// (решается на клиенте до запроса).
export type FriendRequestOutcome = 'sent' | 'friends' | 'already'

export function requestOutcome(row: { status?: string } | null | undefined): Exclude<FriendRequestOutcome, 'already'> {
  return row?.status === 'accepted' ? 'friends' : 'sent'
}
