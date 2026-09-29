import { ref } from 'vue'
import { sb } from './supabase'
import { todayStr } from './date'
import type { MetricTemplate, OnboardingAnswers } from './types'

export type AuthState = { status: 'loading' } | { status: 'redirecting' } | { status: 'ready'; userId: string }

// Портировано из requireAuth() в config.js + IIFE в конце onboarding.js: уже онбордился —
// сразу на дашборд, форма не нужна.
export function useOnboarding() {
  const auth = ref<AuthState>({ status: 'loading' })
  const error = ref<string | null>(null)

  async function init() {
    const { data } = await sb.auth.getSession()
    const session = data.session
    if (!session) {
      auth.value = { status: 'redirecting' }
      window.location.href = '/login-vue/'
      return
    }
    const { data: profile } = await sb.from('profiles').select('onboarded').eq('user_id', session.user.id).maybeSingle()
    if (profile?.onboarded) {
      auth.value = { status: 'redirecting' }
      window.location.href = '/dashboard.html'
      return
    }
    auth.value = { status: 'ready', userId: session.user.id }
  }

  async function seedMetrics(userId: string, list: MetricTemplate[]) {
    if (!list.length) return null
    const rows = list.map((m, i) => ({
      user_id: userId,
      name: m.name,
      icon: m.icon,
      type: m.type,
      goal_value: m.goal_value ?? null,
      goal_direction: m.goal_direction ?? null,
      unit: m.unit ?? '',
      options: m.options ?? [],
      position: i,
    }))
    const { error: err } = await sb.from('metrics').insert(rows)
    return err
  }

  // Портировано из completeOnboarding() в onboarding.js.
  async function complete(userId: string, answers: OnboardingAnswers, bodyParamLabels: { weight: string; fat: string; muscle: string; water: string; kg: string }) {
    const { error: profileError } = await sb
      .from('profiles')
      .upsert({ user_id: userId, gender: answers.gender, birthdate: answers.birthdate, height: answers.height, goal_type: answers.goal_type, onboarded: true })
    if (profileError) return { ok: false as const, stage: 'profile' as const, error: profileError }

    const { data: existingParams } = await sb.from('body_parameters').select('id, name').eq('user_id', userId)
    let weightParamId = existingParams?.find((p) => p.name === bodyParamLabels.weight)?.id
    if (!existingParams || existingParams.length === 0) {
      const defaults = [
        { user_id: userId, name: bodyParamLabels.weight, icon: '⚖️', unit: bodyParamLabels.kg, position: 0 },
        { user_id: userId, name: bodyParamLabels.fat, icon: '🧬', unit: '%', position: 1 },
        { user_id: userId, name: bodyParamLabels.muscle, icon: '💪', unit: bodyParamLabels.kg, position: 2 },
        { user_id: userId, name: bodyParamLabels.water, icon: '💧', unit: '%', position: 3 },
      ]
      const { data: inserted } = await sb.from('body_parameters').insert(defaults).select()
      weightParamId = inserted?.find((p) => p.name === bodyParamLabels.weight)?.id
    }

    if (answers.weight && weightParamId) {
      await sb.from('body_parameter_values').upsert({ user_id: userId, date: todayStr(), parameter_id: weightParamId, value: answers.weight }, { onConflict: 'user_id,date,parameter_id' })
    }

    const seedError = await seedMetrics(userId, answers.selectedMetrics)

    if (answers.goal_type === 'learn_skill' && answers.skills_raw.trim()) {
      const skillNames = answers.skills_raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      if (skillNames.length) await sb.from('skills').insert(skillNames.map((name) => ({ user_id: userId, name, progress: 0, mastered: false })))
    }

    try {
      localStorage.setItem('tour_pending', '1')
    } catch {
      /* не критично */
    }
    return { ok: true as const, seedError: seedError ?? null }
  }

  // Портировано из skipBtn.onclick(): без анкеты, только base-метрики.
  async function skip(userId: string, baseMetricsList: MetricTemplate[]) {
    const { error: profileError } = await sb.from('profiles').upsert({ user_id: userId, onboarded: true })
    if (profileError) return { ok: false as const, error: profileError }
    const seedError = await seedMetrics(userId, baseMetricsList)
    try {
      localStorage.setItem('tour_pending', '1')
    } catch {
      /* не критично */
    }
    return { ok: true as const, seedError: seedError ?? null }
  }

  return { auth, error, init, complete, skip }
}
