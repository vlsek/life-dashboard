import { sb } from './supabase'

// «Избранное» (BACKLOG 6.2): сердечко в шапке страницы + список по шеврону в AppShell только из избранных.
// Хранение: localStorage `favorite_pages` (JSON-массив ключей страниц) — читает AppShell во всех пилотах, мгновенно и офлайн;
// синхронизация между устройствами — profiles.favorite_pages (миграция 035; без неё всё работает локально). Событие
// `favorites:changed` будит AppShell на этой же странице.
export const FAVORITES_KEY = 'favorite_pages'
export const FAVORITES_EVENT = 'favorites:changed'

// путь страницы → ключ в AppShell.pages. Дашборд (главная) и служебные страницы (Аккаунт, вход, онбординг, админка) в избранное
// не добавляются; порядок ключей — порядок страниц в боковом меню.
const PAGE_KEYS: Record<string, string> = {
  goals: 'goals',
  skills: 'skills',
  workouts: 'workouts',
  challenges: 'challenges',
  languages: 'english',
  calendar: 'calendar',
  milestones: 'milestones',
  shop: 'shop',
  community: 'community',
  history: 'history',
}
export const FAVORITABLE_KEYS = Object.values(PAGE_KEYS)

export function pageKeyFor(pathname: string): string | null {
  const m = pathname.match(/^\/([a-z]+)(?:\/|\/index\.html|\.html)?$/)
  return m ? (PAGE_KEYS[m[1]] ?? null) : null
}

// Только известные ключи, без дублей, в порядке бокового меню
export function normalizeFavorites(raw: unknown): string[] {
  const set = new Set(Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : [])
  return FAVORITABLE_KEYS.filter((k) => set.has(k))
}

export function readFavorites(): string[] {
  try {
    return normalizeFavorites(JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]'))
  } catch {
    return []
  }
}

export function writeFavorites(list: string[]): void {
  const clean = normalizeFavorites(list)
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(clean))
  } catch {
    /* приватный режим: избранное сохранится только в профиле */
  }
  window.dispatchEvent(new CustomEvent(FAVORITES_EVENT, { detail: clean }))
}

export function toggleFavorite(list: string[], key: string): string[] {
  return normalizeFavorites(list.includes(key) ? list.filter((k) => k !== key) : [...list, key])
}

// Подтянуть избранное из профиля. Профиль главнее (синхронно между устройствами); если в профиле пока пусто (null), а на этом
// устройстве уже что-то выбрано — отправляем локальное в профиль. Если колонки нет (миграция 035 не применена) — молча остаёмся локальными.
export async function syncFavoritesFromProfile(userId: string): Promise<string[]> {
  const local = readFavorites()
  const { data, error } = await sb.from('profiles').select('favorite_pages').eq('user_id', userId).maybeSingle()
  if (error) return local
  const remote = (data as { favorite_pages?: unknown } | null)?.favorite_pages
  if (Array.isArray(remote)) {
    const clean = normalizeFavorites(remote)
    if (JSON.stringify(clean) !== JSON.stringify(local)) writeFavorites(clean)
    return clean
  }
  if (local.length) await saveFavoritesToProfile(userId, local)
  return local
}

export async function saveFavoritesToProfile(userId: string, list: string[]): Promise<boolean> {
  const { error } = await sb.from('profiles').upsert({ user_id: userId, favorite_pages: normalizeFavorites(list) })
  return !error
}
