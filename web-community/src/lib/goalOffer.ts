import { sb } from './supabase'
import { isMissingFunction } from './friendSummary'
import { friendlyError } from './friendlyError'

// «Предложить другу цель / задачу» (миграция 063 `send_goal_invite`, BACKLOG 41 «8:29», срез 2b).
// Баллы отправитель НЕ задаёт: получатель получит цель с баллами по сложности. Лимит предложений в день задаёт получатель.
export type OfferKind = 'goal' | 'task'
export interface OfferInput {
  kind: OfferKind
  name: string
  stages: number
  difficulty: '' | 'easy' | 'medium' | 'hard'
  deadline: string // ISO или ''
  planDate: string // ISO, обязательна у задачи
}

export type OfferProblem = 'name' | 'date' | null

const ISO = /^\d{4}-\d{2}-\d{2}$/

export function validateOffer(i: OfferInput): OfferProblem {
  const n = i.name.trim()
  if (n.length === 0 || n.length > 120) return 'name'
  if (i.kind === 'task' && !ISO.test(i.planDate)) return 'date'
  return null
}

// Что уходит в send_goal_invite: у цели нет даты плана, у задачи нет этапов/сложности/срока (сервер делает то же — это для чистоты).
export function offerArgs(friend: string, i: OfferInput) {
  const goal = i.kind === 'goal'
  return {
    friend,
    p_kind: i.kind,
    p_name: i.name.trim().replace(/\s+/g, ' '),
    p_stages: goal ? Math.max(1, Math.min(Math.round(i.stages) || 1, 20)) : 1,
    p_difficulty: goal && i.difficulty ? i.difficulty : null,
    p_deadline: goal && ISO.test(i.deadline) ? i.deadline : null,
    p_plan_date: goal ? null : i.planDate,
  }
}

export type OfferResult =
  | { status: 'ok' }
  | { status: 'unsupported' } // миграция 063 не применена
  | { status: 'recipient_limit' } // друг принимает не больше N в день (53400, «recipient daily limit»)
  | { status: 'pending_limit' } // уже 5 ожидающих ответа (53400, «too many pending»)
  | { status: 'not_friend' } // 42501
  | { status: 'error'; message: string }

export function classifyOfferError(err: unknown): OfferResult {
  const e = err as { code?: string; message?: string } | null
  if (isMissingFunction(err)) return { status: 'unsupported' }
  if (e?.code === '53400') return /pending/i.test(e.message || '') ? { status: 'pending_limit' } : { status: 'recipient_limit' }
  if (e?.code === '42501') return { status: 'not_friend' }
  return { status: 'error', message: friendlyError(err, 'save') }
}

export async function sendOffer(friend: string, i: OfferInput): Promise<OfferResult> {
  try {
    const { error } = await sb.rpc('send_goal_invite', offerArgs(friend, i))
    if (error) return classifyOfferError(error)
    return { status: 'ok' }
  } catch (e) {
    return classifyOfferError(e)
  }
}
