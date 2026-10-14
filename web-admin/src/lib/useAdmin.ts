import { ref } from 'vue'
import { sb } from './supabase'
import { friendlyError } from './friendlyError'
import type { AdminUser } from './types'

export type AuthState =
  | { status: 'loading' }
  | { status: 'redirecting' }
  | { status: 'ready'; userId: string; userEmail: string | null }

// Порт admin.js: вход (как requireAuth — без проверки onboarded, она админке не нужна), список пользователей (rpc admin_list_users),
// удаление (rpc admin_delete_user), переключатель «Режим отладки» (profiles.debug_mode + rpc set_debug_mode, BACKLOG 47.4, миграция 066).
// Права проверяет СЕРВЕР: клиент админом себя не объявляет — при ошибке списка показываем «нет доступа».
export function useAdmin() {
  const auth = ref<AuthState>({ status: 'loading' })
  const users = ref<AdminUser[]>([])
  const error = ref<string | null>(null) // человеческий текст; подробности — в консоль (friendlyError)
  const debug = ref<boolean | null>(null) // null — колонки нет (миграция 066 не применена) или не админ: карточку не показываем
  const loaded = ref(false)

  async function init() {
    const { data } = await sb.auth.getSession()
    const session = data.session
    if (!session) {
      auth.value = { status: 'redirecting' }
      window.location.href = '/login/'
      return
    }
    auth.value = { status: 'ready', userId: session.user.id, userEmail: session.user.email ?? null }
    await load()
  }

  async function load() {
    if (auth.value.status !== 'ready') return
    const { data, error: err } = await sb.rpc('admin_list_users')
    loaded.value = true
    if (err) {
      error.value = friendlyError(err, 'load')
      users.value = []
      debug.value = null
      return
    }
    error.value = null
    users.value = (data || []) as AdminUser[]
    await loadDebug(auth.value.userId)
  }

  async function loadDebug(userId: string) {
    const { data, error: err } = await sb.from('profiles').select('debug_mode').eq('user_id', userId).maybeSingle()
    if (err || !data) {
      if (err) console.warn('debug_mode недоступен (миграция 066 не применена?)', err)
      debug.value = null
      return
    }
    debug.value = data.debug_mode === true
  }

  // true — сервер принял; false — откатываем галочку и показываем ошибку.
  async function setDebug(on: boolean): Promise<boolean> {
    const { error: err } = await sb.rpc('set_debug_mode', { p_on: on })
    if (err) {
      console.error(err)
      return false
    }
    debug.value = on
    return true
  }

  // null — удалено (список перечитан); строка — человеческий текст ошибки.
  async function removeUser(u: AdminUser): Promise<string | null> {
    const { error: err } = await sb.rpc('admin_delete_user', { target_user: u.user_id })
    if (err) return friendlyError(err, 'delete')
    await load()
    return null
  }

  return { auth, users, error, debug, loaded, init, load, setDebug, removeUser }
}
