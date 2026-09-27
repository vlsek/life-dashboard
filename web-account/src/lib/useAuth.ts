import { ref } from 'vue'
import { sb } from './supabase'

// Упрощённая версия useAuthAndData() из History/Milestones — Аккаунту не нужно тянуть
// метрики/цели и т.п., только сессия + проверка онбординга, как requireAuth() в config.js.
export type AuthState =
  | { status: 'loading' }
  | { status: 'redirecting' }
  | { status: 'ready'; userId: string; userEmail: string | null }

export function useAuth() {
  const auth = ref<AuthState>({ status: 'loading' })

  async function init() {
    const { data } = await sb.auth.getSession()
    const session = data.session
    if (!session) {
      auth.value = { status: 'redirecting' }
      window.location.href = '/login.html'
      return
    }
    const userId = session.user.id
    const userEmail = session.user.email ?? null

    const { data: profile } = await sb.from('profiles').select('onboarded').eq('user_id', userId).maybeSingle()
    if (!profile?.onboarded) {
      auth.value = { status: 'redirecting' }
      window.location.href = '/onboarding.html'
      return
    }

    auth.value = { status: 'ready', userId, userEmail }
  }

  init()

  return { auth }
}
