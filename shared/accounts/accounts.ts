// Несколько учётных записей на одном устройстве (BACKLOG 1081, решения владельца 2026-10-15): до 3 независимых входов; каждая запись — отдельный
// пользователь Supabase (RLS не меняется). Все пилоты и старые страницы читают сессию из стандартного хранилища supabase-js
// (localStorage[AUTH_KEY]); «активная запись» — та, чья сессия сейчас лежит в AUTH_KEY. Остальные хранятся в STORE_KEY как готовый JSON сессии.
// Переключение = перенос сессии выбранной записи в AUTH_KEY + перезагрузка страницы (решение владельца: «нормально»). Клиенты пилотов не меняются.
// Схема и порядок срезов — docs/ACCOUNTS.md. Модуль без зависимостей: его импортирует и шапка (web-header), и пилоты (logout), и страница входа.

export const SUPABASE_URL = 'https://haxmgtflegsfpxieaydv.supabase.co'
// Ключ стандартного хранилища supabase-js v2: sb-<первая часть хоста проекта>-auth-token
export const AUTH_KEY = `sb-${SUPABASE_URL.replace(/^https?:\/\//, '').split('.')[0]}-auth-token`
export const STORE_KEY = 'accounts_v1'
export const MAX_ACCOUNTS = 3

export interface StoredAccount {
  id: string // user.id (uuid)
  email: string
  session: string // сырой JSON сессии ровно в том виде, как его хранит supabase-js
  savedAt: number // когда сессия последний раз снималась (мс)
}

export interface CurrentSession {
  id: string
  email: string
  raw: string
}

// Текущая сессия из AUTH_KEY: нужен JSON с refresh_token и пользователем (id). Иначе — null (вход не выполнен / мусор)
export function readCurrent(): CurrentSession | null {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(AUTH_KEY)
  } catch {
    return null
  }
  if (!raw) return null
  try {
    const s = JSON.parse(raw) as { refresh_token?: unknown; user?: { id?: unknown; email?: unknown } }
    const id = s?.user?.id
    if (typeof id !== 'string' || !id || typeof s.refresh_token !== 'string' || !s.refresh_token) return null
    return { id, email: typeof s.user?.email === 'string' ? s.user.email : '', raw }
  } catch {
    return null
  }
}

function sanitize(v: unknown): StoredAccount[] {
  if (!Array.isArray(v)) return []
  const out: StoredAccount[] = []
  const seen = new Set<string>()
  for (const x of v) {
    if (!x || typeof x !== 'object') continue
    const a = x as Record<string, unknown>
    if (typeof a.id !== 'string' || !a.id || seen.has(a.id) || typeof a.session !== 'string' || !a.session) continue
    seen.add(a.id)
    out.push({ id: a.id, email: typeof a.email === 'string' ? a.email : '', session: a.session, savedAt: typeof a.savedAt === 'number' ? a.savedAt : 0 })
  }
  return out.slice(0, MAX_ACCOUNTS)
}

export function loadStore(): StoredAccount[] {
  try {
    return sanitize(JSON.parse(localStorage.getItem(STORE_KEY) || '[]'))
  } catch {
    return []
  }
}

function saveStore(list: StoredAccount[]): void {
  try {
    if (list.length) localStorage.setItem(STORE_KEY, JSON.stringify(list.slice(0, MAX_ACCOUNTS)))
    else localStorage.removeItem(STORE_KEY)
  } catch {
    /* хранилище недоступно — работаем с одной записью, как раньше */
  }
}

// Снять текущую сессию в склад (обновляя свежие токены этой записи). Новая запись при полном складе вытесняет самую давнюю НЕактивную
// (штатно до этого не доходит: «Добавить запись» при 3 записях заблокировано).
export function captureCurrent(now: number = Date.now()): StoredAccount[] {
  const cur = readCurrent()
  const list = loadStore()
  if (!cur) return list
  const entry: StoredAccount = { id: cur.id, email: cur.email, session: cur.raw, savedAt: now }
  const idx = list.findIndex((a) => a.id === cur.id)
  if (idx >= 0) list[idx] = entry
  else {
    if (list.length >= MAX_ACCOUNTS) {
      const oldest = list.reduce((m, a, i) => (a.savedAt < list[m].savedAt ? i : m), 0)
      list.splice(oldest, 1)
    }
    list.push(entry)
  }
  saveStore(list)
  return list
}

export interface AccountView {
  id: string
  email: string
  active: boolean
}

// Список для интерфейса: активная запись первой, остальные в порядке добавления
export function listAccounts(): AccountView[] {
  const cur = readCurrent()
  const list = loadStore()
  const views = list.map((a) => ({ id: a.id, email: a.email, active: !!cur && a.id === cur.id }))
  if (cur && !views.some((v) => v.id === cur.id)) views.push({ id: cur.id, email: cur.email, active: true })
  return views.sort((a, b) => Number(b.active) - Number(a.active))
}

export function accountCount(): number {
  return listAccounts().length
}

export const canAddAccount = (): boolean => accountCount() < MAX_ACCOUNTS

// Переключиться: снять текущую (чтобы не потерять обновлённые токены), положить сессию выбранной в AUTH_KEY. Дальше — перезагрузка страницы (делает вызывающий).
export function switchTo(id: string): boolean {
  const cur = readCurrent()
  if (cur && cur.id === id) return false
  const list = captureCurrent()
  const target = list.find((a) => a.id === id)
  if (!target) return false
  try {
    localStorage.setItem(AUTH_KEY, target.session)
  } catch {
    return false
  }
  return true
}

// «Добавить запись»: снять текущую и освободить AUTH_KEY БЕЗ выхода на сервере, чтобы страница входа приняла новый вход. false — склад полон
export function prepareAdd(): boolean {
  if (!canAddAccount()) return false
  captureCurrent()
  try {
    localStorage.removeItem(AUTH_KEY)
  } catch {
    return false
  }
  return true
}

// Выход из записи уже сделан на сервере (signOut) — убрать её из склада. Остались другие — активируется первая, 'switched'; иначе 'none' (на страницу входа)
export function removeAccount(id: string): 'switched' | 'none' {
  const rest = loadStore().filter((a) => a.id !== id)
  saveStore(rest)
  try {
    const cur = readCurrent()
    if (cur && cur.id === id) localStorage.removeItem(AUTH_KEY)
    if (rest.length) {
      if (!readCurrent()) localStorage.setItem(AUTH_KEY, rest[0].session)
      return 'switched'
    }
  } catch {
    /* ниже вернём 'none' */
  }
  return 'none'
}

// «Выйти из всех»: склад и текущая сессия очищаются (серверный выход по каждой записи делает вызывающий — см. sessionsToRevoke)
export function clearAll(): void {
  try {
    localStorage.removeItem(STORE_KEY)
    localStorage.removeItem(AUTH_KEY)
  } catch {
    /* ничего не поделать */
  }
}

// Сессии, которые надо отозвать на сервере при «Выйти из всех» (текущая — отдельно, её закрывает обычный signOut)
export function sessionsToRevoke(): { id: string; session: string }[] {
  const cur = readCurrent()
  return loadStore()
    .filter((a) => !cur || a.id !== cur.id)
    .map((a) => ({ id: a.id, session: a.session }))
}

// После серверного signOut текущей записи (id взят ДО выхода): убрать её из склада. 'switched' — осталась другая запись, она уже активна (дальше на главную);
// 'none' — записей нет (на страницу входа). Без id (сессии не было) склад чистится целиком.
export function finishLogout(id: string | null): 'switched' | 'none' {
  if (!id) {
    clearAll()
    return 'none'
  }
  return removeAccount(id)
}
