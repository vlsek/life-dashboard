import { ref } from 'vue'
import { sb } from './supabase'
import { buildSkillRow } from './skills'
import { allDone, checklistPercent, normalizeChecklist, toggleItem } from './skillChecklist'
import type { Skill, SkillFormInput } from './types'
import { completionDelta, emitPointsFloat } from './pointsFloat'
import { friendlyError } from './friendlyError'

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
  // Есть ли колонка skills.category (миграция 112): по первой загруженной строке, у пустого списка — пробным запросом. Нет колонки — работаем как раньше.
  const hasCategory = ref(false)
  // Есть ли колонка skills.checklist (миграция 122, BACKLOG 77.12) — так же; нет колонки — поле «Этапы» не показываем.
  const hasChecklist = ref(false)
  const loaded = ref(false) // первая загрузка закончилась (успехом или ошибкой): до этого «нет …» показывать нельзя — ложная пустота

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
    try {
      await loadData(userId)
    } finally {
      loaded.value = true
    }
  }

  async function loadData(userId: string) {
    const { data, error: err } = await sb.from('skills').select('*').eq('user_id', userId).order('created_at')
    if (err) {
      error.value = friendlyError(err, 'load')
      return
    }
    error.value = null
    items.value = (data || []) as Skill[]
    if (items.value.length) hasCategory.value = 'category' in items.value[0]
    else hasCategory.value = !(await sb.from('skills').select('category').limit(1)).error
    if (items.value.length) hasChecklist.value = 'checklist' in items.value[0]
    else hasChecklist.value = !(await sb.from('skills').select('checklist').limit(1)).error
  }

  async function reload() {
    if (auth.value.status === 'ready') await load(auth.value.userId)
  }

  async function addSkill(userId: string, res: SkillFormInput) {
    const row = buildSkillRow(res, { categoryColumn: hasCategory.value, checklistColumn: hasChecklist.value })
    const { error: err } = await sb.from('skills').insert({ user_id: userId, progress: 0, mastered: false, ...row })
    if (err) throw err
    await reload()
  }

  async function updateSkill(id: string, res: SkillFormInput) {
    const existing = items.value.find((s) => s.id === id) ?? null
    const row = buildSkillRow(res, { categoryColumn: hasCategory.value, checklistColumn: hasChecklist.value, existing })
    // 77.12: у навыка с этапами процент и «освоен» следуют за списком (правка списка может сдвинуть прогресс)
    const patch: Record<string, unknown> = { ...row }
    const pct = row.checklist ? checklistPercent(row.checklist) : null
    if (pct !== null) {
      patch.progress = pct
      patch.mastered = pct >= 100
    }
    const { error: err } = await sb.from('skills').update(patch).eq('id', id)
    if (err) throw err
    if (existing && pct !== null) emitPointsFloat(completionDelta(!!existing.mastered, pct >= 100, existing.points, SKILL_DEFAULT_POINTS))
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

  // Отметить/снять этап (77.12): процент и «освоен» следуют за списком; все этапы — навык освоен (+очки), снял — снят (−очки).
  async function toggleChecklistItem(s: Skill, index: number) {
    const list = toggleItem(normalizeChecklist(s.checklist), index)
    const progress = checklistPercent(list) ?? 0
    const { error: err } = await sb.from('skills').update({ checklist: list, progress, mastered: progress >= 100 }).eq('id', s.id)
    if (err) throw err
    emitPointsFloat(completionDelta(!!s.mastered, progress >= 100, s.points, SKILL_DEFAULT_POINTS))
    await reload()
  }

  async function toggleMastered(s: Skill) {
    const mastered = !s.mastered
    const list = normalizeChecklist(s.checklist)
    // у навыка с этапами: «освоен» отмечает все этапы, снятие возвращает процент по списку
    let extra: Record<string, unknown> = {}
    if (list.length) {
      let next = list
      if (mastered) next = allDone(list)
      else if (list.every((i) => i.done)) next = list.map((it, i) => (i === list.length - 1 ? { ...it, done: false } : it)) // снятие «освоено» не оставляет 100% по списку
      extra = { checklist: next, progress: checklistPercent(next) }
    }
    const { error: err } = await sb.from('skills').update({ mastered, progress: mastered ? 100 : s.progress, ...extra }).eq('id', s.id)
    if (err) throw err
    emitPointsFloat(completionDelta(!!s.mastered, mastered, s.points, SKILL_DEFAULT_POINTS))
    await reload()
  }

  return { auth, items, error, hasCategory, hasChecklist, loaded, init, reload, addSkill, updateSkill, deleteSkill, bumpProgress, toggleChecklistItem, toggleMastered }
}
