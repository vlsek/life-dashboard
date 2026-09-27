import { ref } from 'vue'
import { sb } from './supabase'
import { toFriendIdSet } from './community'
import type { FollowedProfile, LeaderboardRow, TodayActivityRow, PublicProfile } from './types'

export type AuthState =
  | { status: 'loading' }
  | { status: 'redirecting' }
  | { status: 'ready'; userId: string; userEmail: string | null }

// Тот же паттерн session/onboarded redirect, что и в остальных пилотах — портировано
// из requireAuth()/requireOnboarded() в config.js.
export function useCommunity() {
  const auth = ref<AuthState>({ status: 'loading' })
  const friendIds = ref<Set<string>>(new Set())
  const friendProfiles = ref<FollowedProfile[]>([])
  const leaderboard = ref<LeaderboardRow[]>([])
  const leaderboardError = ref<string | null>(null)
  const today = ref<TodayActivityRow[]>([])
  const todayError = ref<string | null>(null)
  const profile = ref<PublicProfile | null>(null)

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

    const { data: prof } = await sb.from('profiles').select('onboarded').eq('user_id', userId).maybeSingle()
    if (!prof?.onboarded) {
      auth.value = { status: 'redirecting' }
      window.location.href = '/onboarding.html'
      return
    }

    auth.value = { status: 'ready', userId, userEmail }
    await reload()
  }

  async function reload() {
    if (auth.value.status !== 'ready') return
    const userId = auth.value.userId
    await Promise.all([loadFriends(userId), loadLeaderboard(), loadToday(), loadOwnProfile(userId)])
  }

  async function loadFriends(userId: string) {
    const { data: follows } = await sb.from('follows').select('followed_id').eq('follower_id', userId)
    friendIds.value = toFriendIdSet(follows || [])
    const ids = [...friendIds.value]
    if (ids.length === 0) {
      friendProfiles.value = []
      return
    }
    const { data: profiles } = await sb.from('profiles').select('user_id, display_name, avatar_url').in('user_id', ids)
    friendProfiles.value = (profiles || []) as FollowedProfile[]
  }

  async function loadLeaderboard() {
    const { data, error } = await sb.rpc('get_leaderboard')
    if (error) {
      leaderboardError.value = error.message
      return
    }
    leaderboardError.value = null
    leaderboard.value = (data || []) as LeaderboardRow[]
  }

  async function loadToday() {
    const { data, error } = await sb.rpc('get_today_activity')
    if (error) {
      todayError.value = error.message
      return
    }
    todayError.value = null
    today.value = (data || []) as TodayActivityRow[]
  }

  async function loadOwnProfile(userId: string) {
    const { data } = await sb.from('profiles').select('display_name, leaderboard_visible').eq('user_id', userId).maybeSingle()
    profile.value = (data as PublicProfile) || { display_name: null, leaderboard_visible: true }
  }

  async function unfollow(userId: string, followedId: string) {
    const { error } = await sb.from('follows').delete().eq('follower_id', userId).eq('followed_id', followedId)
    if (error) throw error
    await reload()
  }

  // Портировано из addBtn.onclick в renderFriendsCard(): по email или по нику, через две
  // разные RPC (сервер решает совпадение — не тянем список всех пользователей на клиент).
  async function follow(userId: string, query: string): Promise<{ ok: true } | { ok: false; reason: 'not_found' | 'thats_you' | 'error'; message?: string }> {
    const isEmail = query.includes('@')
    const { data: foundId, error } = isEmail ? await sb.rpc('find_user_by_email', { lookup_email: query }) : await sb.rpc('find_user_by_name', { lookup_name: query })
    if (error || !foundId) return { ok: false, reason: 'not_found' }
    if (foundId === userId) return { ok: false, reason: 'thats_you' }
    const { error: insErr } = await sb.from('follows').insert({ follower_id: userId, followed_id: foundId })
    if (insErr) return { ok: false, reason: 'error', message: insErr.message }
    await reload()
    return { ok: true }
  }

  async function saveProfile(userId: string, displayName: string | null, visible: boolean) {
    const { error } = await sb.from('profiles').upsert({ user_id: userId, display_name: displayName, leaderboard_visible: visible })
    if (error) throw error
    await reload()
  }

  return { auth, friendIds, friendProfiles, leaderboard, leaderboardError, today, todayError, profile, init, reload, unfollow, follow, saveProfile }
}
