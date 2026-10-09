import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import GoalInvites from './components/GoalInvites.vue'
import { incomingPending, normalizeInvites, outgoingNotices, useGoalInvites, type InviteRow } from './lib/goalInvites'

// Миграция 063 (BACKLOG 41 «8:29», срез 2a): плашки предложений целей/задач от друзей. Клиент обязан работать и ДО применения миграции.
const db = vi.hoisted(() => ({
  data: [] as unknown[],
  loadError: null as null | { code?: string; message: string },
  respondError: null as null | { code?: string; message: string },
  throwOnLoad: false,
  calls: [] as { fn: string; args: unknown }[],
}))

vi.mock('./lib/supabase', () => ({
  sb: {
    rpc: (fn: string, args?: unknown) => {
      db.calls.push({ fn, args })
      if (fn === 'get_goal_invites') {
        if (db.throwOnLoad) return Promise.reject(new Error('network'))
        return Promise.resolve({ data: db.loadError ? null : db.data, error: db.loadError })
      }
      if (fn === 'respond_goal_invite') return Promise.resolve({ data: null, error: db.respondError })
      return Promise.resolve({ data: null, error: null })
    },
  },
}))

const row = (o: Partial<InviteRow> = {}): Record<string, unknown> => ({
  id: 'i1', direction: 'incoming', other_user_id: 'u2', other_name: 'Аня', kind: 'goal', name: 'Бегать', stages: 3,
  difficulty: 'hard', deadline: '2026-11-01', plan_date: null, status: 'pending', completed_at: null, unread: true, ...o,
})

beforeEach(() => {
  db.data = []
  db.loadError = null
  db.respondError = null
  db.throwOnLoad = false
  db.calls = []
})

describe('normalizeInvites / селекторы', () => {
  it('отбрасывает мусор и чужие формы', () => {
    expect(normalizeInvites(null)).toEqual([])
    expect(normalizeInvites([null, 1, {}, row({ kind: 'x' as never }), row({ direction: 'sideways' as never }), row({ status: 'weird' as never }), row()])).toHaveLength(1)
  })
  it('входящие — только ожидающие МНЕ', () => {
    const rows = normalizeInvites([row(), row({ id: 'i2', status: 'accepted' }), row({ id: 'i3', direction: 'outgoing' })])
    expect(incomingPending(rows).map((r) => r.id)).toEqual(['i1'])
  })
  it('новости: выполнено важнее принято; прочитанное и входящие не в счёт', () => {
    const rows = normalizeInvites([
      row({ id: 'a', direction: 'outgoing', status: 'accepted', completed_at: '2026-10-09T10:00:00Z' }),
      row({ id: 'b', direction: 'outgoing', status: 'accepted' }),
      row({ id: 'c', direction: 'outgoing', status: 'declined' }),
      row({ id: 'd', direction: 'outgoing', status: 'accepted', unread: false }),
      row({ id: 'e', direction: 'outgoing', status: 'pending' }),
      row({ id: 'f' }),
    ])
    expect(outgoingNotices(rows).map((n) => n.row.id + ':' + n.event)).toEqual(['a:completed', 'b:accepted', 'c:declined'])
  })
})

describe('useGoalInvites', () => {
  it('до миграции (ошибка чтения или сбой сети) — недоступно и тихо', async () => {
    db.loadError = { code: '42883', message: 'function get_goal_invites() does not exist' }
    const a = useGoalInvites()
    await a.load()
    expect(a.available.value).toBe(false)
    db.loadError = null
    db.throwOnLoad = true
    await a.load()
    expect(a.available.value).toBe(false)
    expect(a.rows.value).toEqual([])
  })
  it('принять: зовёт respond_goal_invite(accept=true), обновляет цели и список', async () => {
    db.data = [row()]
    const reload = vi.fn()
    const a = useGoalInvites(reload)
    await a.load()
    expect(a.rows.value).toHaveLength(1)
    db.data = []
    await a.respond('i1', true)
    expect(db.calls.find((c) => c.fn === 'respond_goal_invite')?.args).toEqual({ invite_id: 'i1', accept: true })
    expect(reload).toHaveBeenCalledTimes(1)
    expect(a.rows.value).toHaveLength(0)
    expect(a.actionError.value).toBe('')
  })
  it('отклонить не перезагружает цели', async () => {
    db.data = [row()]
    const reload = vi.fn()
    const a = useGoalInvites(reload)
    await a.load()
    await a.respond('i1', false)
    expect(reload).not.toHaveBeenCalled()
  })
  it('P0002 (уже отвечено) — без ошибки на экране; другая ошибка — понятный текст без технических слов', async () => {
    db.data = [row()]
    const a = useGoalInvites()
    await a.load()
    db.respondError = { code: 'P0002', message: 'invite not found' }
    await a.respond('i1', true)
    expect(a.actionError.value).toBe('')
    db.respondError = { message: 'TypeError: Failed to fetch https://x.supabase.co' }
    await a.respond('i1', true)
    expect(a.actionError.value).not.toBe('')
    expect(a.actionError.value).not.toContain('supabase')
  })
  it('«Понятно»: новость сразу пропадает и уходит mark_goal_invite_seen', async () => {
    db.data = [row({ direction: 'outgoing', status: 'accepted' })]
    const a = useGoalInvites()
    await a.load()
    expect(outgoingNotices(a.rows.value)).toHaveLength(1)
    await a.dismiss('i1')
    expect(outgoingNotices(a.rows.value)).toHaveLength(0)
    expect(db.calls.find((c) => c.fn === 'mark_goal_invite_seen')?.args).toEqual({ invite_id: 'i1' })
  })
})

describe('GoalInvites.vue', () => {
  const mountIt = (incoming: Record<string, unknown>[], notices: Record<string, unknown>[] = [], extra: Record<string, unknown> = {}) =>
    mount(GoalInvites, {
      props: {
        incoming: normalizeInvites(incoming),
        notices: outgoingNotices(normalizeInvites(notices)),
        busyId: '',
        error: '',
        ...extra,
      },
    })

  it('пусто — ничего не рисует', () => {
    expect(mountIt([]).find('[data-test="goal-invites"]').exists()).toBe(false)
  })
  it('входящая цель: имя друга, название, детали и две кнопки', async () => {
    const w = mountIt([row()])
    expect(w.find('[data-test="invite-from"]').text()).toBe('Аня')
    expect(w.find('[data-test="invite-name"]').text()).toContain('Бегать')
    expect(w.find('[data-test="invite-details"]').text()).toMatch(/3/)
    await w.find('[data-test="invite-accept"]').trigger('click')
    await w.find('[data-test="invite-decline"]').trigger('click')
    expect(w.emitted('accept')?.[0]).toEqual(['i1'])
    expect(w.emitted('decline')?.[0]).toEqual(['i1'])
  })
  it('входящая задача показывает дату и не показывает этапы', () => {
    const w = mountIt([row({ kind: 'task', plan_date: '2026-10-12', stages: 1, difficulty: null, deadline: null })])
    expect(w.text()).toContain('12.10.2026')
    expect(w.find('[data-test="invite-details"]').exists()).toBe(false)
  })
  it('без имени друга — «Друг/A friend»; пока идёт ответ, кнопки заблокированы', () => {
    const w = mountIt([row({ other_name: null })], [], { busyId: 'i1' })
    expect(w.find('[data-test="invite-from"]').text().length).toBeGreaterThan(0)
    expect(w.find('[data-test="invite-accept"]').attributes('disabled')).toBeDefined()
  })
  it('новость отправителю: выполнено, с кнопкой «Понятно»', async () => {
    const w = mountIt([], [row({ direction: 'outgoing', status: 'accepted', completed_at: '2026-10-09T10:00:00Z' })])
    const n = w.find('[data-test="invite-notice"]')
    expect(n.attributes('data-event')).toBe('completed')
    expect(n.text()).toContain('Бегать')
    await w.find('[data-test="invite-dismiss"]').trigger('click')
    expect(w.emitted('dismiss')?.[0]).toEqual(['i1'])
  })
  it('ошибка показывается с role=alert', () => {
    const w = mountIt([row()], [], { error: 'Нет связи' })
    expect(w.find('[data-test="invite-error"]').attributes('role')).toBe('alert')
  })
})

// Чтобы flushPromises не считался неиспользованным импортом при расширении тестов
void flushPromises
