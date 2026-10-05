import { ref } from 'vue'
import { withFallbackProfiles } from './friendCards'
import { sb } from './supabase'
import { toFriendIdSet } from './community'
import { mergeFriendScope, requestOutcome, toAcceptedIdSet, type FriendRequestOutcome } from './friends'
import type { Period } from './leaderboardView'
import { badgesByUser } from './badges'
import { frameShadow } from './customFrame'
import type { BadgeRow, FollowedProfile, FriendRequestRow, LeaderboardRow, TodayActivityRow, PublicProfile } from './types'

export type AuthState =
  | { status: 'loading' }
  | { status: 'redirecting' }
  | { status: 'ready'; userId: string; userEmail: string | null }

// Тот же паттерн session/onboarded redirect, что и в остальных пилотах — портировано
// из requireAuth()/requireOnboarded() в config.js.
export function useCommunity() {
  const auth = ref<AuthState>({ status: 'loading' })
  // friendIds — то, что показывает фильтр «Только друзья»: принятые друзья ∪ подписки
  const friendIds = ref<Set<string>>(new Set())
  const followIds = ref<Set<string>>(new Set())
  const acceptedIds = ref<Set<string>>(new Set())
  const followProfiles = ref<FollowedProfile[]>([])
  const acceptedProfiles = ref<FollowedProfile[]>([])
  const requests = ref<FriendRequestRow[]>([])
  // false — миграция 029 не применена: блок заявок/друзей скрыт, раздел работает как раньше
  const friendsApi = ref(false)
  const leaderboard = ref<LeaderboardRow[]>([])
  const leaderboardError = ref<string | null>(null)
  // период лидерборда; periodApi=false — миграция 046 не применена: переключатель скрыт, всё как раньше («всё время»)
  const period = ref<Period>('all')
  const periodApi = ref(true)
  // значки достижений: userId → ключи (RPC get_public_badges, миграция 047); нет функции — пусто, остальное работает
  const badges = ref<Map<string, string[]>>(new Map())
  const badgesApi = ref(true)
  // рамки аватарок: userId → ключ рамки (RPC get_public_frames, миграция 049); нет функции — без рамок у других, остальное работает
  const frames = ref<Map<string, string>>(new Map())
  const framesApi = ref(true)
  const today = ref<TodayActivityRow[]>([])
  const todayError = ref<string | null>(null)
  const profile = ref<PublicProfile | null>(null)
  const myFrame = ref<string | null>(null) // выбранная рамка аватарки (BACKLOG 491, миграция 048); нет колонки — без рамки

  async function init() {
    const { data } = await sb.auth.getSession()
    const session = data.session
    if (!session) {
      auth.value = { status: 'redirecting' }
      window.location.href = '/login/'
      return
    }
    const userId = session.user.id
    const userEmail = session.user.email ?? null

    const { data: prof } = await sb.from('profiles').select('onboarded').eq('user_id', userId).maybeSingle()
    if (!prof?.onboarded) {
      auth.value = { status: 'redirecting' }
      window.location.href = '/onboarding/'
      return
    }

    auth.value = { status: 'ready', userId, userEmail }
    await reload()
  }

  async function reload() {
    if (auth.value.status !== 'ready') return
    const userId = auth.value.userId
    await Promise.all([loadFriends(userId), loadLeaderboard(), loadBadges(), loadFrames(), loadToday(), loadOwnProfile(userId)])
  }

  async function loadFriends(userId: string) {
    const { data: follows } = await sb.from('follows').select('followed_id').eq('follower_id', userId)
    followIds.value = toFriendIdSet(follows || [])

    const { data: fr, error: frErr } = await sb.rpc('get_friend_ids')
    if (frErr) {
      friendsApi.value = false
      acceptedIds.value = new Set()
      requests.value = []
    } else {
      friendsApi.value = true
      acceptedIds.value = toAcceptedIdSet(fr)
      const { data: rq, error: rqErr } = await sb.rpc('get_friend_requests')
      requests.value = rqErr ? [] : ((rq || []) as FriendRequestRow[])
    }

    friendIds.value = mergeFriendScope(followIds.value, acceptedIds.value)
    const ids = [...friendIds.value]
    if (ids.length === 0) {
      followProfiles.value = []
      acceptedProfiles.value = []
      return
    }
    const { data: profiles } = await sb.from('profiles').select('user_id, display_name, avatar_url').in('user_id', ids)
    // не вернулись профили (права, ошибка, удалён) — всё равно показываем карточку, иначе «Друзья» врёт про «ни на кого не подписан»
    const all = withFallbackProfiles(ids, (profiles || []) as FollowedProfile[])
    followProfiles.value = all.filter((p) => followIds.value.has(p.user_id))
    acceptedProfiles.value = all.filter((p) => acceptedIds.value.has(p.user_id))
  }

  async function loadLeaderboard() {
    if (periodApi.value) {
      const { data, error } = await sb.rpc('get_leaderboard_period', { range_key: period.value })
      if (!error) {
        leaderboardError.value = null
        leaderboard.value = (data || []) as LeaderboardRow[]
        return
      }
      periodApi.value = false
      period.value = 'all'
    }
    const { data, error } = await sb.rpc('get_leaderboard')
    if (error) {
      leaderboardError.value = error.message
      return
    }
    leaderboardError.value = null
    leaderboard.value = (data || []) as LeaderboardRow[]
  }

  async function loadBadges() {
    if (!badgesApi.value) return
    const { data, error } = await sb.rpc('get_public_badges')
    if (error) {
      badgesApi.value = false
      badges.value = new Map()
      return
    }
    badges.value = badgesByUser((data || []) as BadgeRow[])
  }

  async function loadFrames() {
    if (!framesApi.value) return
    const { data, error } = await sb.rpc('get_public_frames')
    if (error) {
      framesApi.value = false
      frames.value = new Map()
      return
    }
    const m = new Map<string, string>()
    for (const r of (data || []) as { user_id: string; frame: string | null }[]) if (r.frame && frameShadow(r.frame)) m.set(r.user_id, r.frame)
    frames.value = m
  }

  async function setPeriod(next: Period) {
    period.value = next
    await loadLeaderboard()
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
    // рамка — отдельным запросом: без миграции 048 имя и настройка видимости всё равно загрузятся
    const fr = await sb.from('profiles').select('customization').eq('user_id', userId).maybeSingle()
    const cz = (fr.error ? null : (fr.data as { customization?: Record<string, unknown> | null } | null)?.customization) || null
    const key = cz && typeof cz.avatar_frame === 'string' ? cz.avatar_frame : null
    myFrame.value = key && frameShadow(key) ? key : null
  }

  async function unfollow(userId: string, followedId: string) {
    const { error } = await sb.from('follows').delete().eq('follower_id', userId).eq('followed_id', followedId)
    if (error) throw error
    await reload()
  }

  // Поиск по email или по нику через две разные RPC (сервер решает совпадение — не тянем список
  // всех пользователей на клиент). Портировано из addBtn.onclick в renderFriendsCard().
  async function lookupUser(userId: string, query: string): Promise<{ ok: true; id: string } | { ok: false; reason: 'not_found' | 'thats_you' | 'error'; message?: string }> {
    const isEmail = query.includes('@')
    const { data: foundId, error } = isEmail ? await sb.rpc('find_user_by_email', { lookup_email: query }) : await sb.rpc('find_user_by_name', { lookup_name: query })
    // Ошибка самого запроса (нет функции в БД, права, сеть) — НЕ «пользователь не найден»: иначе
    // причина, почему кнопки «не работают», остаётся невидимой. «Не найден» — только чистый пустой ответ.
    if (error) return { ok: false, reason: 'error', message: error.message }
    if (!foundId) return { ok: false, reason: 'not_found' }
    if (foundId === userId) return { ok: false, reason: 'thats_you' }
    return { ok: true, id: foundId as string }
  }

  async function follow(userId: string, query: string): Promise<{ ok: true } | { ok: false; reason: 'not_found' | 'thats_you' | 'error'; message?: string }> {
    const found = await lookupUser(userId, query)
    if (!found.ok) return found
    const { error: insErr } = await sb.from('follows').insert({ follower_id: userId, followed_id: found.id })
    if (insErr) return { ok: false, reason: 'error', message: insErr.message }
    await reload()
    return { ok: true }
  }

  // Заявка в друзья (RPC из миграции 029). Встречная заявка принимается сервером сразу.
  async function sendFriendRequest(
    userId: string,
    query: string,
  ): Promise<{ ok: true; outcome: FriendRequestOutcome } | { ok: false; reason: 'not_found' | 'thats_you' | 'error'; message?: string }> {
    const found = await lookupUser(userId, query)
    if (!found.ok) return found
    if (acceptedIds.value.has(found.id)) return { ok: true, outcome: 'already' }
    const { data, error } = await sb.rpc('send_friend_request', { target: found.id })
    if (error) return { ok: false, reason: 'error', message: error.message }
    await reload()
    return { ok: true, outcome: requestOutcome(data as { status?: string } | null) }
  }

  async function respondToRequest(requestId: string, accept: boolean) {
    const { error } = await sb.rpc('respond_friend_request', { request_id: requestId, accept })
    if (error) throw error
    await reload()
  }

  // Убрать из друзей и отменить свою исходящую заявку — одна и та же функция на сервере.
  async function removeFriend(otherUserId: string) {
    const { error } = await sb.rpc('remove_friend', { other: otherUserId })
    if (error) throw error
    await reload()
  }

  async function saveProfile(userId: string, displayName: string | null, visible: boolean) {
    const { error } = await sb.from('profiles').upsert({ user_id: userId, display_name: displayName, leaderboard_visible: visible })
    if (error) throw error
    await reload()
  }

  return {
    auth, friendIds, followProfiles, acceptedProfiles, requests, friendsApi,
    leaderboard, leaderboardError, period, periodApi, badges, frames, myFrame, today, todayError, profile,
    init, reload, setPeriod, unfollow, follow, sendFriendRequest, respondToRequest, removeFriend, saveProfile,
  }
}
