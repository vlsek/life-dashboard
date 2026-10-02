import { ref } from 'vue'
import { sb } from './supabase'
import { buildSkillRow } from './skills'
import type { Skill, SkillFormInput } from './types'
import { completionDelta, emitPointsFloat } from './pointsFloat'

// Очки навыка по умолчанию — как в балансе: пусто → 10
const SKILL_DEFAULT_POINTS = 10

export type AuthState =
  | { status: 'loading' }
  | { status: 'redirecting' }
  | { status: 'ready'; userId: string; userEmail: string | null }

// Тот же паттерн session/onboarded redirect, что и в useGoals.ts/useMilestones.ts —
// портировано из requireAuth()/requireOnboarded() в config.js.
export function useSkills() {
  const auth = ref<AuthState>({ status: 'loading' })
  const items = ref<Skill[]>([])
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
    const { data, error: err } = await sb.from('skills').select('*').eq('user_id', userId).order('created_at')
    if (err) {
      error.value = err.message
      return
    }
    error.value = null
    items.value = (data || []) as Skill[]
  }

  async function reload() {
    if (auth.value.status === 'ready') await load(auth.value.userId)
  }

  async function addSkill(userId: string, res: SkillFormInput) {
    const row = buildSkillRow(res)
    const { error: err } = await sb.from('skills').insert({ user_id: userId, progress: 0, mastered: false, ...row })
    if (err) throw err
    await reload()
  }

  async function updateSkill(id: string, res: SkillFormInput) {
    const row = buildSkillRow(res)
    const { error: err } = await sb.from('skills').update(row).eq('id', id)
    if (err) throw err
    await reload()
  }

  async function deleteSkill(id: string) {
    const { error: err } = await sb.from('skills').delete().eq('id', id)
    if (err) throw err
    await reload()
  }

  // ±step%, зажато в [0, 100] — 1:1 с bumpProgress() в skills.js.
  async function bumpProgress(s: Skill, direction: 1 | -1) {
    const step = s.step ?? 10
    const progress = Math.max(0, Math.min(100, (s.progress ?? 0) + direction * step))
    const { error: err } = await sb.from('skills').update({ progress, mastered: progress >= 100 }).eq('id', s.id)
    if (err) throw err
    // дошёл до 100% — навык освоен (+очки), откатил ниже — снят (−очки)
    emitPointsFloat(completionDelta(!!s.mastered, progress >= 100, s.points, SKILL_DEFAULT_POINTS))
    await reload()
  }

  async function toggleMastered(s: Skill) {
    const mastered = !s.mastered
    const { error: err } = await sb.from('skills').update({ mastered, progress: mastered ? 100 : s.progress }).eq('id', s.id)
    if (err) throw err
    emitPointsFloat(completionDelta(!!s.mastered, mastered, s.points, SKILL_DEFAULT_POINTS))
    await reload()
  }

  return { auth, items, error, init, reload, addSkill, updateSkill, deleteSkill, bumpProgress, toggleMastered }
}
