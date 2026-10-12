import { sb } from './supabase'
import { isMissingFunction } from './friendSummary'

// Вишлист друга (BACKLOG 57.6; миграция 077 `get_friend_wishlist`): друг только ПОСМОТРЕТЬ список желаний (ответ владельца 2026-10-12:
// «друг просто может посмотреть список, а дарение — в жизни»). Никаких подарков и переводов. Данные — одним объектом из функции security definer.
export interface WishItem {
  id: string
  name: string
  link: string | null
  image_url: string | null
  cost: number | null
  cost_sparks: number | null
}
export interface Wishlist {
  hidden: boolean
  items: WishItem[]
}
export type WishlistResult = { status: 'ok'; data: Wishlist } | { status: 'unsupported' } | { status: 'error'; error: unknown }

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : null)
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null)

// Ссылка — только http(s): чужую `javascript:`-ссылку никогда не выводим как href
export function safeLink(raw: unknown): string | null {
  const s = str(raw)
  if (!s) return null
  try {
    const u = new URL(s)
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null
  } catch {
    return null
  }
}

export function parseWishlist(raw: unknown): Wishlist | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const items: WishItem[] = []
  for (const x of Array.isArray(r.items) ? (r.items as Record<string, unknown>[]) : []) {
    if (!x || typeof x.id !== 'string' || typeof x.name !== 'string' || !x.name.trim()) continue
    items.push({ id: x.id, name: x.name, link: safeLink(x.link), image_url: safeLink(x.image_url), cost: num(x.cost), cost_sparks: num(x.cost_sparks) })
  }
  return { hidden: r.hidden === true, items: r.hidden === true ? [] : items }
}

// Цена для показа: в огоньках, если задана `cost_sparks`, иначе в баллах; нет цены — null
export function priceOf(i: WishItem): { value: number; sparks: boolean } | null {
  if (i.cost_sparks !== null && i.cost_sparks > 0) return { value: i.cost_sparks, sparks: true }
  if (i.cost !== null && i.cost > 0) return { value: i.cost, sparks: false }
  return null
}

export async function fetchFriendWishlist(friendId: string): Promise<WishlistResult> {
  const { data, error } = await sb.rpc('get_friend_wishlist', { friend: friendId })
  if (error) return isMissingFunction(error) ? { status: 'unsupported' } : { status: 'error', error }
  const parsed = parseWishlist(data)
  return parsed ? { status: 'ok', data: parsed } : { status: 'error', error: new Error('bad wishlist') }
}
