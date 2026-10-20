// Сессия без сети (BACKLOG 66.3). Проблема: если токен доступа истёк (живёт ~1 час), а сети нет, supabase-js не может его обновить
// и getSession() отвечает «сессии нет» — страницы решают, что пользователь вышел, и уводят на вход. Хотя сессия лежит в localStorage
// целой (refresh_token не потрачен). Обёртка: при ошибке обновления из-за СЕТИ (или navigator.onLine === false) отдаём сохранённую
// сессию; данные с сервера офлайн всё равно не придут, а очередь записей нужен только user.id. Появилась сеть — supabase-js сам обновит токен.
// Выход, отозванный токен и прочие НЕсетевые ошибки обёртка не трогает: тогда сохранённой сессии уже нет или ошибка пройдёт как есть.
// Модуль без зависимостей от Vue; подключается одной строкой в supabase.ts каждого пилота.
import { AUTH_KEY } from '../accounts/accounts'

interface StoredSession { access_token?: string; refresh_token?: string; expires_at?: number; user?: { id?: string } }
interface GetSessionResult { data: { session: unknown | null }; error: { name?: string; message?: string; status?: number } | null }
interface ClientLike { auth: { getSession: () => Promise<GetSessionResult> } }

export function isNetworkAuthError(err: GetSessionResult['error']): boolean {
  if (!err) return false
  if (err.name === 'AuthRetryableFetchError') return true
  return err.status === 0 || /failed to fetch|networkerror|load failed|network request failed|fetch failed/i.test(err.message ?? '')
}

export function readStoredSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as StoredSession
    return s && s.refresh_token && s.user?.id ? s : null
  } catch {
    return null
  }
}

export function patchOfflineSession<T extends ClientLike>(client: T): T {
  const original = client.auth.getSession.bind(client.auth)
  client.auth.getSession = async () => {
    const res = await original()
    if (res.data.session) return res
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false
    if (!offline && !isNetworkAuthError(res.error)) return res
    const stored = readStoredSession()
    return stored ? { data: { session: stored }, error: null } : res
  }
  return client
}
