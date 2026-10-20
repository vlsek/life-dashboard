// Офлайн-чтение для supabase-js (BACKLOG 66.12). Идея: подменяем `fetch` клиента. Успешные GET к /rest/v1/ запоминаем (по пользователю),
// а если сеть оборвалась (fetch бросил исключение) — отдаём последний сохранённый ответ. Хуки страниц не меняются: они видят обычный ответ.
// Только чтение: POST/PATCH/DELETE и всё, кроме /rest/v1/, идёт как обычно; ответ сервера с ошибкой (4xx/5xx) кэшем не подменяется —
// кэш нужен ТОЛЬКО когда связи нет. Кэш чистится при выходе из аккаунта. Без Vue; подключается одной опцией createClient (global.fetch).

export interface ReadStore {
  get(key: string): Promise<CachedResponse | undefined>
  put(key: string, value: CachedResponse): Promise<void>
  clearUser(userId: string): Promise<void>
  clearAll(): Promise<void>
}
export interface CachedResponse { body: string; status: number; contentType: string; contentRange: string | null }

export const MAX_BODY_CHARS = 2_000_000 // больше — не кэшируем (не забиваем хранилище одним ответом)
export const CACHE_PREFIX = 'ld-read-'

// Кто делает запрос: sub из JWT в Authorization; без входа ('anon') — отдельная корзина.
export function userOfAuth(auth: string | null | undefined): string {
  const m = /^Bearer\s+([\w-]+)\.([\w-]+)\./.exec(auth ?? '')
  if (!m) return 'anon'
  try {
    const json = atob(m[2].replace(/-/g, '+').replace(/_/g, '/'))
    const sub = (JSON.parse(json) as { sub?: unknown }).sub
    return typeof sub === 'string' && /^[\w-]{1,64}$/.test(sub) ? sub : 'anon'
  } catch {
    return 'anon'
  }
}

function header(init: RequestInit | undefined, input: RequestInfo | URL, name: string): string {
  const h = new Headers(init?.headers ?? (typeof input === 'object' && 'headers' in input ? (input as Request).headers : undefined))
  return h.get(name) ?? ''
}

// Ключ ответа: адрес + заголовки, которые меняют форму ответа (single(), диапазон, подсчёт).
export function cacheKey(userId: string, url: string, accept: string, range: string, prefer: string): string {
  return `${userId}|${url}|${accept}|${range}|${/count=\w+/.exec(prefer)?.[0] ?? ''}`
}

export function isCacheable(method: string, url: string): boolean {
  if (method !== 'GET') return false
  try {
    const u = new URL(url)
    return u.pathname.startsWith('/rest/v1/') && !u.pathname.startsWith('/rest/v1/rpc/')
  } catch {
    return false
  }
}

export function createCachingFetch(store: ReadStore, base: typeof fetch = (...a) => fetch(...a)): typeof fetch {
  return async (input, init) => {
    const method = (init?.method ?? (typeof input === 'object' && 'method' in input ? (input as Request).method : 'GET')).toUpperCase()
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url
    if (!isCacheable(method, url)) return base(input, init)
    const user = userOfAuth(header(init, input, 'authorization'))
    const key = cacheKey(user, url, header(init, input, 'accept'), header(init, input, 'range'), header(init, input, 'prefer'))
    let resp: Response
    try {
      resp = await base(input, init)
    } catch (err) {
      const hit = await store.get(key).catch(() => undefined)
      if (!hit) throw err
      const h: Record<string, string> = { 'content-type': hit.contentType, 'x-ld-offline-cache': '1' }
      if (hit.contentRange) h['content-range'] = hit.contentRange
      return new Response(hit.body, { status: hit.status, headers: h })
    }
    if (resp.ok) {
      try {
        const body = await resp.clone().text()
        if (body.length <= MAX_BODY_CHARS) {
          await store.put(key, { body, status: resp.status, contentType: resp.headers.get('content-type') ?? 'application/json', contentRange: resp.headers.get('content-range') })
        }
      } catch {
        /* кэш — вторичен: ошибка записи ответ не ломает */
      }
    }
    return resp
  }
}

// Хранилище на Cache API (есть в браузере и в WebView Capacitor). Один кэш на пользователя — выход одним удалением.
export function cacheApiStore(cs: CacheStorage | undefined = typeof caches === 'undefined' ? undefined : caches): ReadStore {
  const fake = (key: string) => new Request('https://ld-read.invalid/' + encodeURIComponent(key))
  const nameOf = (key: string) => CACHE_PREFIX + key.split('|')[0]
  return {
    async get(key) {
      if (!cs) return undefined
      const r = await (await cs.open(nameOf(key))).match(fake(key))
      if (!r) return undefined
      return { body: await r.text(), status: Number(r.headers.get('x-status') ?? 200), contentType: r.headers.get('content-type') ?? 'application/json', contentRange: r.headers.get('content-range') }
    },
    async put(key, v) {
      if (!cs) return
      const h: Record<string, string> = { 'content-type': v.contentType, 'x-status': String(v.status) }
      if (v.contentRange) h['content-range'] = v.contentRange
      await (await cs.open(nameOf(key))).put(fake(key), new Response(v.body, { status: 200, headers: h }))
    },
    async clearUser(userId) {
      if (cs) await cs.delete(CACHE_PREFIX + userId)
    },
    async clearAll() {
      if (!cs) return
      for (const n of await cs.keys()) if (n.startsWith(CACHE_PREFIX)) await cs.delete(n)
    },
  }
}

// Подключение к клиенту: при выходе (SIGNED_OUT) кэш чтения стирается — чужие данные на устройстве не остаются.
export function clearReadCacheOnSignOut(client: { auth: { onAuthStateChange: (cb: (event: string) => void) => unknown } }, store: ReadStore): void {
  client.auth.onAuthStateChange((event) => { if (event === 'SIGNED_OUT') void store.clearAll() })
}

export const sharedReadStore = cacheApiStore()
export const cachingFetch = createCachingFetch(sharedReadStore)
