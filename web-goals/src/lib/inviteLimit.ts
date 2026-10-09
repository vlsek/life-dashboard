import { sb } from './supabase'

// Сколько предложений целей/задач от друзей я принимаю в день (миграция 063, `profiles.goal_invites_per_day`; BACKLOG 41 «8:29»:
// лимит задаёт ПОЛУЧАТЕЛЬ). Пусто в базе = 10 в сутки (выбор агента, как в `send_goal_invite`), 0 = никаких.
export const DEFAULT_INVITE_LIMIT = 10
export const INVITE_LIMIT_CHOICES = [0, 3, 5, 10, 25, 50]

// Что показать в списке: стандартные варианты + своё значение из базы, если его там нет (например, поставили в SQL Editor).
export function limitChoices(current: number): number[] {
  return INVITE_LIMIT_CHOICES.includes(current) ? INVITE_LIMIT_CHOICES : [...INVITE_LIMIT_CHOICES, current].sort((a, b) => a - b)
}

export function effectiveLimit(stored: number | null | undefined): number {
  return typeof stored === 'number' && Number.isFinite(stored) && stored >= 0 ? Math.min(Math.round(stored), 100) : DEFAULT_INVITE_LIMIT
}

export type LimitLoad = { status: 'ok'; value: number } | { status: 'unsupported' }

// Нет колонки (миграция 063 не применена) или сбой чтения — настройка скрыта, ничего не показываем.
export async function loadInviteLimit(userId: string): Promise<LimitLoad> {
  try {
    const { data, error } = await sb.from('profiles').select('goal_invites_per_day').eq('user_id', userId).maybeSingle()
    if (error || !data) return { status: 'unsupported' }
    return { status: 'ok', value: effectiveLimit((data as { goal_invites_per_day?: number | null }).goal_invites_per_day) }
  } catch {
    return { status: 'unsupported' }
  }
}

// true — записано. Ошибку не бросает: вызывающий возвращает прежнее значение в списке.
export async function saveInviteLimit(userId: string, n: number): Promise<boolean> {
  const v = effectiveLimit(n)
  try {
    const { error } = await sb.from('profiles').update({ goal_invites_per_day: v }).eq('user_id', userId)
    return !error
  } catch {
    return false
  }
}
