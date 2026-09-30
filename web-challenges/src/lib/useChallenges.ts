import { ref } from 'vue'
import { sb } from './supabase'
import { todayStr } from './date'
import { buildInsertCustom, buildInsertFromTemplate } from './challenges'
import type { Challenge, ChallengeEntry, ChallengeTemplate, CustomChallengeFormInput } from './types'

export type AuthState =
  | { status: 'loading' }
  | { status: 'redirecting' }
  | { status: 'ready'; userId: string; userEmail: string | null }

// Тот же паттерн session/onboarded redirect, что и в useGoals.ts/useMilestones.ts —
// портировано из requireAuth()/requireOnboarded() в config.js.
export function useChallenges() {
  const auth = ref<AuthState>({ status: 'loading' })
  const instances = ref<Challenge[]>([])
  const entriesByChallenge = ref<Record<string, ChallengeEntry[]>>({})
  const error = ref<string | null>(null)

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

    const { data: profile } = await sb.from('profiles').select('onboarded').eq('user_id', userId).maybeSingle()
    if (!profile?.onboarded) {
      auth.value = { status: 'redirecting' }
      window.location.href = '/onboarding/'
      return
    }

    auth.value = { status: 'ready', userId, userEmail }
    await load(userId)
  }

  async function load(userId: string) {
    const { data: rows, error: err } = await sb
      .from('challenge_instances')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true)
      .order('created_at')
    if (err) {
      error.value = err.message
      return
    }
    error.value = null
    instances.value = (rows || []) as Challenge[]

    const { data: allEntries } = await sb.from('challenge_entries').select('*').eq('user_id', userId).order('date')
    const grouped: Record<string, ChallengeEntry[]> = {}
    ;(allEntries || []).forEach((e) => {
      const list = (grouped[e.challenge_id] ??= [])
      list.push(e as ChallengeEntry)
    })
    entriesByChallenge.value = grouped
  }

  async function reload() {
    if (auth.value.status === 'ready') await load(auth.value.userId)
  }

  function requireUserId(): string {
    if (auth.value.status !== 'ready') throw new Error('not authenticated')
    return auth.value.userId
  }

  async function startFromTemplate(tpl: ChallengeTemplate) {
    const userId = requireUserId()
    const { error: err } = await sb.from('challenge_instances').insert({ user_id: userId, ...buildInsertFromTemplate(tpl) })
    if (err) throw err
    await reload()
  }

  async function startCustom(form: CustomChallengeFormInput) {
    const userId = requireUserId()
    const { error: err } = await sb.from('challenge_instances').insert({ user_id: userId, ...buildInsertCustom(form) })
    if (err) throw err
    await reload()
  }

  // Портировано из upsertDailyEntry(): select-затем-update-или-insert, не onConflict —
  // см. комментарий в migrations/019_challenges.sql про то, почему нет уникального индекса.
  async function upsertDailyEntry(challengeId: string, dateStr: string, value: number) {
    const userId = requireUserId()
    const { data: existing } = await sb.from('challenge_entries').select('id').eq('challenge_id', challengeId).eq('date', dateStr).maybeSingle()
    if (existing) {
      const { error: err } = await sb.from('challenge_entries').update({ value }).eq('id', existing.id)
      if (err) throw err
    } else {
      const { error: err } = await sb.from('challenge_entries').insert({ user_id: userId, challenge_id: challengeId, date: dateStr, value })
      if (err) throw err
    }
    await reload()
  }

  async function addCumulativeEntry(challengeId: string, note: string) {
    const userId = requireUserId()
    const { error: err } = await sb
      .from('challenge_entries')
      .insert({ user_id: userId, challenge_id: challengeId, date: todayStr(), value: 1, note: note || null })
    if (err) throw err
    await reload()
  }

  async function deleteEntry(id: string) {
    const { error: err } = await sb.from('challenge_entries').delete().eq('id', id)
    if (err) throw err
    await reload()
  }

  async function markCompleted(ch: Challenge) {
    const { error: err } = await sb.from('challenge_instances').update({ completed: true, completed_at: new Date().toISOString() }).eq('id', ch.id)
    if (err) throw err
    await reload()
  }

  async function abandonChallenge(ch: Challenge) {
    const { error: err } = await sb.from('challenge_instances').update({ active: false }).eq('id', ch.id)
    if (err) throw err
    await reload()
  }

  return {
    auth,
    instances,
    entriesByChallenge,
    error,
    init,
    reload,
    startFromTemplate,
    startCustom,
    upsertDailyEntry,
    addCumulativeEntry,
    deleteEntry,
    markCompleted,
    abandonChallenge,
  }
}
