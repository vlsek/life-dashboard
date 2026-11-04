import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'

// 69.11 срез 5: сессии (workout_sessions, миграция 113) попадают в состояние useWorkouts; нет таблицы или сбой — пусто, остальное работает
const db = vi.hoisted(() => ({ sessions: [] as any[], mode: 'ok' as 'ok' | 'missing' | 'fail' }))
vi.mock('./supabase', () => ({
  sb: {
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'u1', email: 'a@b.c' } } } }) },
    from: (table: string) => {
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        order: () => chain,
        limit: () => chain,
        update: () => chain,
        match: () => Promise.resolve({ error: null }),
        maybeSingle: () => Promise.resolve({ data: table === 'profiles' ? { onboarded: true, workout_program: null } : null, error: null }),
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => {
          if (table === 'workout_sessions') {
            if (db.mode === 'missing') return Promise.resolve({ data: null, error: { code: 'PGRST205', message: 'schema cache' } }).then(res, rej)
            if (db.mode === 'fail') return Promise.resolve({ data: null, error: { code: '500', message: 'boom' } }).then(res, rej)
            return Promise.resolve({ data: db.sessions, error: null }).then(res, rej)
          }
          return Promise.resolve({ data: [], error: null }).then(res, rej)
        },
      }
      return chain
    },
  },
}))

import { useWorkouts } from './useWorkouts'
import { resetSessionProbe } from './sessionProbe'
import { createOutbox, memoryStorage } from './offlineOutbox'
import { setOutboxForTests } from './outboxClient'
import { sb } from './supabase'

const row = { id: 's1', user_id: 'u1', name: null, date: '2026-10-08', started_at: '2026-10-08T10:00:00Z', finished_at: '2026-10-08T10:30:00Z', routine_id: null, notes: null, source: 'live' }
async function ready() {
  const wk = useWorkouts()
  await flushPromises()
  return wk
}

beforeEach(() => {
  localStorage.clear()
  resetSessionProbe()
  db.sessions = [row]
  db.mode = 'ok'
  setOutboxForTests(createOutbox({ client: sb as never, storage: memoryStorage(), isOnline: () => true }))
})

describe('useWorkouts: загрузка сессий', () => {
  it('таблица есть — сессии в состоянии', async () => {
    const wk = await ready()
    expect(wk.sessions.value.map((s) => s.id)).toEqual(['s1'])
  })
  it('таблицы нет — список пуст, ошибки загрузки нет', async () => {
    db.mode = 'missing'
    const wk = await ready()
    expect(wk.sessions.value).toEqual([])
    expect(wk.loadError.value).toBeNull()
  })
  it('сбой запроса сессий не ломает раздел', async () => {
    db.mode = 'fail'
    const wk = await ready()
    expect(wk.sessions.value).toEqual([])
    expect(wk.loadError.value).toBeNull()
    expect(wk.loaded.value).toBe(true)
  })
  it('updateSession сразу обновляет название и заметку в списке сессий (лента истории)', async () => {
    const wk = await ready()
    expect(wk.sessions.value[0].name).toBeNull()
    const r = await wk.updateSession('u1', 's1', { name: '  Ноги ', notes: ' заметка ' })
    expect(r).toEqual({ name: 'Ноги', notes: 'заметка' })
    expect(wk.sessions.value[0]).toMatchObject({ id: 's1', name: 'Ноги', notes: 'заметка' })
    await wk.updateSession('u1', 's1', { name: '', notes: null })
    expect(wk.sessions.value[0]).toMatchObject({ name: null, notes: null })
  })
})
