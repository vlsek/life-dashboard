import { ref } from 'vue'
import { sb } from './supabase'
import { todayStr } from './date'
import { googleProfile, type GoogleProfile } from './googleProfile'
import type { BodyParamKey, MetricTemplate, OnboardingAnswers } from './types'

// Имя профиля (обязательное) и аватарка: выбранное животное (BACKLOG раздел 29) или фото из Google (оно подставляется, только если в профиле своей
// ещё нет — не затираем); null — аватарку не трогаем.
export interface Identity {
  name: string
  avatarUrl: string | null
}
function identityRow(i: Identity): { display_name: string; avatar_url?: string } {
  return i.avatarUrl ? { display_name: i.name, avatar_url: i.avatarUrl } : { display_name: i.name }
}

export type AuthState = { status: 'loading' } | { status: 'redirecting' } | { status: 'ready'; userId: string }

// Портировано из requireAuth() в config.js + IIFE в конце onboarding.js: уже онбордился —
// сразу на дашборд, форма не нужна.
export function useOnboarding() {
  const auth = ref<AuthState>({ status: 'loading' })
  const error = ref<string | null>(null)
  // имя и аватарка из Google-аккаунта (если вошли через Google) — для предзаполнения поля «Имя» (BACKLOG 766 + 841)
  const google = ref<GoogleProfile>({ name: null, avatar: null })
  // имя, уже сохранённое в профиле (например, задано раньше), — приоритетнее Google
  const savedName = ref<string | null>(null)

  async function init() {
    const { data } = await sb.auth.getSession()
    const session = data.session
    if (!session) {
      auth.value = { status: 'redirecting' }
      window.location.href = '/login/'
      return
    }
    const { data: profile } = await sb.from('profiles').select('onboarded, display_name, avatar_url').eq('user_id', session.user.id).maybeSingle()
    if (profile?.onboarded) {
      auth.value = { status: 'redirecting' }
      window.location.href = '/dashboard/'
      return
    }
    const g = googleProfile(session.user)
    // своя аватарка в профиле приоритетнее Google — не затираем
    google.value = (profile as { avatar_url?: string | null } | null)?.avatar_url ? { ...g, avatar: null } : g
    savedName.value = (profile as { display_name?: string | null } | null)?.display_name?.trim() || null
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
      ...(m.ask_note ? { ask_note: true } : {}),
    }))
    const { error: err } = await sb.from('metrics').insert(rows)
    if (!err || !list.some((m) => m.ask_note)) return err
    // Без миграции 058 колонки ask_note нет — создаём метрики без неё (заметка просто не будет спрашиваться), а не оставляем человека без метрик
    if (!/ask_note/i.test(String((err as { message?: unknown }).message ?? ''))) return err
    const plain = await sb.from('metrics').insert(rows.map(({ ask_note: _drop, ...rest }) => rest))
    return plain.error
  }

  // Портировано из completeOnboarding() в onboarding.js.
  async function complete(userId: string, answers: OnboardingAnswers, identity: Identity, bodyParamLabels: { weight: string; fat: string; muscle: string; water: string; kg: string }) {
    const { error: profileError } = await sb
      .from('profiles')
      .upsert({ user_id: userId, ...identityRow(identity), gender: answers.gender, birthdate: answers.birthdate, height: answers.height, goal_type: answers.goal_type, onboarded: true })
    if (profileError) return { ok: false as const, stage: 'profile' as const, error: profileError }

    if (answers.bodyParamKeys.length) {
      const { data: existingParams } = await sb.from('body_parameters').select('id, name').eq('user_id', userId)
      let weightParamId = existingParams?.find((p) => p.name === bodyParamLabels.weight)?.id
      if (!existingParams || existingParams.length === 0) {
        const all: Record<BodyParamKey, { name: string; icon: string; unit: string }> = {
          weight: { name: bodyParamLabels.weight, icon: '⚖️', unit: bodyParamLabels.kg },
          fat: { name: bodyParamLabels.fat, icon: '🧬', unit: '%' },
          muscle: { name: bodyParamLabels.muscle, icon: '💪', unit: bodyParamLabels.kg },
          water: { name: bodyParamLabels.water, icon: '💧', unit: '%' },
        }
        const defaults = answers.bodyParamKeys.map((key, position) => ({ user_id: userId, ...all[key], position }))
        const { data: inserted } = await sb.from('body_parameters').insert(defaults).select()
        weightParamId = inserted?.find((p) => p.name === bodyParamLabels.weight)?.id
      }

      if (answers.weight && weightParamId) {
        await sb.from('body_parameter_values').upsert({ user_id: userId, date: todayStr(), parameter_id: weightParamId, value: answers.weight }, { onConflict: 'user_id,date,parameter_id' })
      }
    }

    const seedError = await seedMetrics(userId, answers.selectedMetrics)

    // Раскладка Дашборда — необязательная часть: если колонки profiles.dashboard_layout ещё нет (миграция 015),
    // онбординг не должен из-за этого падать.
    if (answers.layout) {
      try {
        await sb.from('profiles').upsert({ user_id: userId, dashboard_layout: answers.layout })
      } catch {
        /* не критично */
      }
    }

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
  async function skip(userId: string, identity: Identity, baseMetricsList: MetricTemplate[]) {
    const { error: profileError } = await sb.from('profiles').upsert({ user_id: userId, ...identityRow(identity), onboarded: true })
    if (profileError) return { ok: false as const, error: profileError }
    const seedError = await seedMetrics(userId, baseMetricsList)
    try {
      localStorage.setItem('tour_pending', '1')
    } catch {
      /* не критично */
    }
    return { ok: true as const, seedError: seedError ?? null }
  }

  return { auth, error, google, savedName, init, complete, skip }
}
