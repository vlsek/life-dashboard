import { ref } from 'vue'
import { sb } from './supabase'
import { friendlyError } from './friendlyError'

// Предложения целей и задач от друзей (миграция 063, BACKLOG 41 «8:29», срез 2a).
// Безопасно ДО применения миграции: функции get_goal_invites нет / сбой чтения — available=false, плашка не рисуется, раздел работает как раньше.

export type InviteKind = 'goal' | 'task'
export type InviteStatus = 'pending' | 'accepted' | 'declined' | 'cancelled'

export interface InviteRow {
  id: string
  direction: 'incoming' | 'outgoing'
  other_user_id: string
  other_name: string | null
  kind: InviteKind
  name: string
  stages: number
  difficulty: 'easy' | 'medium' | 'hard' | null
  deadline: string | null
  plan_date: string | null
  status: InviteStatus
  completed_at: string | null
  unread: boolean
}

export type NoticeEvent = 'completed' | 'accepted' | 'declined'
export interface InviteNotice {
  row: InviteRow
  event: NoticeEvent
}

// Что пришло из базы -> только годные строки (мусор и чужие формы отбрасываются, как в normalizePlanned).
export function normalizeInvites(raw: unknown): InviteRow[] {
  if (!Array.isArray(raw)) return []
  const out: InviteRow[] = []
  for (const r of raw) {
    if (!r || typeof r !== 'object') continue
    const o = r as Record<string, unknown>
    if (typeof o.id !== 'string' || typeof o.name !== 'string') continue
    if (o.direction !== 'incoming' && o.direction !== 'outgoing') continue
    if (o.kind !== 'goal' && o.kind !== 'task') continue
    if (o.status !== 'pending' && o.status !== 'accepted' && o.status !== 'declined' && o.status !== 'cancelled') continue
    out.push({
      id: o.id,
      direction: o.direction,
      other_user_id: typeof o.other_user_id === 'string' ? o.other_user_id : '',
      other_name: typeof o.other_name === 'string' && o.other_name.trim() ? o.other_name.trim() : null,
      kind: o.kind,
      name: o.name,
      stages: typeof o.stages === 'number' ? o.stages : 1,
      difficulty: o.difficulty === 'easy' || o.difficulty === 'medium' || o.difficulty === 'hard' ? o.difficulty : null,
      deadline: typeof o.deadline === 'string' ? o.deadline : null,
      plan_date: typeof o.plan_date === 'string' ? o.plan_date : null,
      status: o.status,
      completed_at: typeof o.completed_at === 'string' ? o.completed_at : null,
      unread: o.unread === true,
    })
  }
  return out
}

// Ожидающие ответа предложения МНЕ.
export function incomingPending(rows: InviteRow[]): InviteRow[] {
  return rows.filter((r) => r.direction === 'incoming' && r.status === 'pending')
}

// Непрочитанные новости по МОИМ предложениям: выполнено (важнее) / принято / отклонено.
export function outgoingNotices(rows: InviteRow[]): InviteNotice[] {
  const out: InviteNotice[] = []
  for (const r of rows) {
    if (r.direction !== 'outgoing' || !r.unread) continue
    if (r.completed_at) out.push({ row: r, event: 'completed' })
    else if (r.status === 'accepted') out.push({ row: r, event: 'accepted' })
    else if (r.status === 'declined') out.push({ row: r, event: 'declined' })
  }
  return out
}

export function useGoalInvites(onAccepted?: () => void | Promise<void>) {
  const rows = ref<InviteRow[]>([])
  const available = ref(false)
  const busyId = ref('')
  const actionError = ref('')

  async function load() {
    try {
      const { data, error } = await sb.rpc('get_goal_invites')
      if (error) {
        available.value = false
        rows.value = []
        return
      }
      available.value = true
      rows.value = normalizeInvites(data)
    } catch {
      available.value = false
      rows.value = []
    }
  }

  async function respond(id: string, accept: boolean) {
    if (busyId.value) return
    busyId.value = id
    actionError.value = ''
    try {
      const { error } = await sb.rpc('respond_goal_invite', { invite_id: id, accept })
      if (error) {
        // P0002 — уже отвечено/отозвано (другое устройство или друг отозвал): просто обновляем список
        if ((error as { code?: string }).code !== 'P0002') actionError.value = friendlyError(error)
      } else if (accept && onAccepted) {
        await onAccepted()
      }
    } catch (e) {
      actionError.value = friendlyError(e as { message?: unknown })
    } finally {
      busyId.value = ''
      await load()
    }
  }

  // «Понятно» у новости отправителя: сразу убираем, потом сообщаем базе (при сбое новость вернётся при следующей загрузке).
  async function dismiss(id: string) {
    rows.value = rows.value.map((r) => (r.id === id ? { ...r, unread: false } : r))
    try {
      await sb.rpc('mark_goal_invite_seen', { invite_id: id })
    } catch {
      /* не критично */
    }
  }

  return { rows, available, busyId, actionError, load, respond, dismiss }
}
