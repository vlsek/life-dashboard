import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, finishLogout, listAccounts, prepareAdd, readCurrent, clearAll, sessionsToRevoke, switchTo } from '../../../shared/accounts/accounts'
import { sb } from './supabase'

// Действия над учётными записями (BACKLOG 1081). Склад и правила — shared/accounts/accounts.ts; здесь только то, что требует сети и перехода по страницам.
const ANON_KEY = 'sb_publishable_jvg_Y0JtOC66Edj1WbAgqg_n0LfjWAF'

export const accountsForUi = listAccounts

// Переключиться на запись: сессия выбранной ложится в стандартный ключ, страница перезагружается (решение владельца: перезагрузка — нормально)
export function switchAccount(id: string, reload: () => void = () => location.reload()): boolean {
  if (!switchTo(id)) return false
  reload()
  return true
}

// «Добавить запись»: текущая остаётся в складе (без выхода на сервере), страница входа принимает новый вход. false — уже три записи
export function addAccount(go: (url: string) => void = (u) => (location.href = u)): boolean {
  if (!prepareAdd()) return false
  go('/login/?add=1')
  return true
}

// Выйти из текущей записи: серверный signOut, запись уходит из склада; осталась другая — она активна, на главную; иначе на страницу входа
export async function logoutThis(go: (url: string) => void = (u) => (location.href = u)): Promise<void> {
  const id = readCurrent()?.id ?? null
  try {
    await sb.auth.signOut()
  } catch {
    /* сеть упала — локально всё равно выходим */
  }
  go(finishLogout(id) === 'switched' ? '/' : '/login/')
}

// Отозвать сессию записи на сервере отдельным клиентом без хранилища (его localStorage не трогаем)
async function revokeStored(session: string): Promise<void> {
  try {
    const s = JSON.parse(session) as { access_token?: string; refresh_token?: string }
    if (!s.access_token || !s.refresh_token) return
    const c = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
    const { error } = await c.auth.setSession({ access_token: s.access_token, refresh_token: s.refresh_token })
    if (!error) await c.auth.signOut()
  } catch {
    /* отзыв не удался — запись всё равно уходит с устройства */
  }
}

// «Выйти из всех»: остальные записи отзываются на сервере, затем текущая; склад и сессия очищаются; на страницу входа
export async function logoutEverywhere(go: (url: string) => void = (u) => (location.href = u)): Promise<void> {
  await Promise.all(sessionsToRevoke().map((a) => revokeStored(a.session)))
  try {
    await sb.auth.signOut()
  } catch {
    /* сеть упала — локально всё равно выходим */
  }
  clearAll()
  go('/login/')
}
