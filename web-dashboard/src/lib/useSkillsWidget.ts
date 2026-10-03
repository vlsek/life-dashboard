import { ref } from 'vue'
import { sb } from './supabase'
import { emitPointsFloat } from './pointsFloat'
import { t } from './i18n'

// Виджет «Навыки» на главной (BACKLOG 391, владелец 2026-10-03: «любой навык можно добавить на главную и отмечать прогресс»).
// Механизм — КОПИЯ раздела Навыков (web-skills/src/lib/useSkills.ts: bumpProgress, completionDelta; правило пилотов — копировать, не
// импортировать): ±шаг% в границах 0..100, на 100% навык освоен (+очки, пусто → 10), откат ниже 100% снимает освоение (−очки).
// Выбранные навыки — id в `config.skills` элемента раскладки (lib/layout.ts).

export const SKILL_DEFAULT_POINTS = 10

export interface WidgetSkill {
  id: string
  name: string
  progress: number
  mastered: boolean
  step: number
  points: number | null
}

export interface SkillOption {
  id: string
  name: string
  mastered: boolean
}

export function skillPercent(progress: number | null | undefined): number {
  const n = Number(progress)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

// Новый прогресс после шага вверх/вниз: зажат в [0, 100]
export function nextProgress(progress: number | null | undefined, step: number | null | undefined, dir: 1 | -1): number {
  return Math.max(0, Math.min(100, (Number(progress) || 0) + dir * (step ?? 10)))
}

// Сколько баллов даёт/отнимает смена статуса «освоено» (как completionDelta в разделе Навыков)
export function skillDelta(wasMastered: boolean, nowMastered: boolean, points: number | null | undefined): number {
  if (wasMastered === nowMastered) return 0
  const p = points ?? SKILL_DEFAULT_POINTS
  return nowMastered ? p : -p
}

const COLS = 'id, name, progress, mastered, step, points'
type Row = { id: string; name: string; progress: number | null; mastered: boolean | null; step: number | null; points: number | null }
const toSkill = (r: Row): WidgetSkill => ({ id: r.id, name: r.name, progress: skillPercent(r.progress), mastered: !!r.mastered, step: r.step ?? 10, points: r.points ?? null })

// Все навыки пользователя — для выбора галочками в окне раскладки
export async function loadSkillOptions(userId: string): Promise<SkillOption[]> {
  const { data, error } = await sb.from('skills').select('id, name, mastered').eq('user_id', userId).order('created_at')
  if (error) return []
  return ((data || []) as { id: string; name: string; mastered: boolean | null }[]).map((r) => ({ id: r.id, name: r.name, mastered: !!r.mastered }))
}

export type SkillsWidgetState = 'loading' | 'ready' | 'empty' | 'error'

export function useSkillsWidget() {
  const state = ref<SkillsWidgetState>('loading')
  const skills = ref<WidgetSkill[]>([])
  const error = ref('')
  const busy = ref<Set<string>>(new Set())
  let userId = ''

  async function load(uid: string, ids: string[]) {
    userId = uid
    state.value = 'loading'
    error.value = ''
    const { data, error: err } = await sb.from('skills').select(COLS).eq('user_id', uid).in('id', ids)
    if (err) {
      error.value = err.message
      state.value = 'error'
      return
    }
    const byId = new Map(((data || []) as Row[]).map((r) => [r.id, toSkill(r)]))
    // порядок — как выбрано в окне раскладки; удалённые навыки молча пропускаются
    skills.value = ids.map((id) => byId.get(id)).filter((s): s is WidgetSkill => !!s)
    state.value = skills.value.length > 0 ? 'ready' : 'empty'
  }

  async function bump(id: string, dir: 1 | -1) {
    const i = skills.value.findIndex((s) => s.id === id)
    if (i < 0 || busy.value.has(id)) return
    const before = skills.value[i]
    const progress = nextProgress(before.progress, before.step, dir)
    if (progress === before.progress) return
    const mastered = progress >= 100
    busy.value = new Set(busy.value).add(id)
    error.value = ''
    skills.value = skills.value.map((s) => (s.id === id ? { ...s, progress, mastered } : s)) // сразу на экране
    const { error: err } = await sb.from('skills').update({ progress, mastered }).eq('id', id).eq('user_id', userId)
    const rest = new Set(busy.value)
    rest.delete(id)
    busy.value = rest
    if (err) {
      skills.value = skills.value.map((s) => (s.id === id ? before : s))
      error.value = t('dash_widget_skills_error') + err.message
      return
    }
    emitPointsFloat(skillDelta(before.mastered, mastered, before.points))
  }

  return { state, skills, error, busy, load, bump }
}
