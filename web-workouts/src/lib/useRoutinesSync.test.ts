import { beforeEach, describe, expect, it, vi } from 'vitest'

// BACKLOG 69.7 срез 2: рутины синхронизируются с таблицами миграции 113; без таблицы остаются на устройстве.
const h = vi.hoisted(() => ({
  tables: true,
  routines: [] as Record<string, unknown>[],
  items: [] as Record<string, unknown>[],
  ups: [] as { table: string; payload: any }[],
  dels: [] as { table: string; match: any }[],
}))
vi.mock('./supabase', () => ({
  sb: {
    from: (t: string) => {
      const c: any = { select: () => c, eq: () => c, limit: () => c }
      c.then = (res: any, rej: any) => {
        if (!h.tables) return Promise.resolve({ data: null, error: { code: 'PGRST205', message: 'schema cache' } }).then(res, rej)
        return Promise.resolve({ data: t === 'workout_routines' ? h.routines : t === 'workout_routine_items' ? h.items : [], error: null }).then(res, rej)
      }
      return c
    },
  },
}))
vi.mock('./outboxClient', () => ({
  qUpsert: (_u: string, table: string, _k: string, payload: unknown) => (h.ups.push({ table, payload }), Promise.resolve({ error: null, queued: false })),
  qDelete: (_u: string, table: string, _k: string, match: unknown) => (h.dels.push({ table, match }), Promise.resolve({ error: null, queued: false })),
}))

import { useRoutines } from './useRoutines'
import { resetSessionProbe } from './sessionProbe'

beforeEach(() => { h.tables = true; h.routines = []; h.items = []; h.ups = []; h.dels = []; resetSessionProbe(); localStorage.clear(); useRoutines().routines.value = [] })

describe('useRoutines.sync', () => {
  it('забирает рутины с сервера', async () => {
    h.routines = [{ id: 'r1', name: 'Грудь', position: 0, archived: false, updated_at: '2026-02-01T00:00:00Z' }]
    h.items = [{ routine_id: 'r1', exercise_id: 'e1', position: 0, target_sets: 4, superset_group: null }]
    const rt = useRoutines()
    expect(await rt.sync('u1')).toBe(true)
    expect(rt.routines.value.map((r) => [r.id, r.name, r.items[0].target_sets])).toEqual([['r1', 'Грудь', 4]])
  })
  it('локальную рутину, которой нет на сервере, отправляет; после этого правка и удаление идут на сервер', async () => {
    const rt = useRoutines()
    rt.routines.value = [{ id: 'L1', name: 'Локальная', updated_at: '2026-01-01T00:00:00Z', items: [{ exercise_id: 'e1', target_sets: 3, superset_group: null }] }]
    await rt.sync('u1')
    await Promise.resolve()
    expect(h.ups.map((x) => x.table)).toEqual(['workout_routines', 'workout_routine_items'])
    expect(h.ups[0].payload).toMatchObject({ id: 'L1', user_id: 'u1', name: 'Локальная', position: 0 })
    expect(h.ups[1].payload[0]).toMatchObject({ routine_id: 'L1', exercise_id: 'e1', target_sets: 3 })
    h.ups = []; h.dels = []
    rt.rename('L1', 'Новая')
    await Promise.resolve(); await Promise.resolve()
    expect(h.ups[0].payload.name).toBe('Новая')
    expect(h.dels).toEqual([{ table: 'workout_routine_items', match: { routine_id: 'L1' } }])
    h.dels = []
    rt.remove('L1')
    expect(h.dels).toEqual([{ table: 'workout_routines', match: { id: 'L1' } }])
  })
  it('нет таблицы миграции 113 — ничего не уходит на сервер, рутины на устройстве', async () => {
    h.tables = false
    const rt = useRoutines()
    rt.routines.value = [{ id: 'L1', name: 'Локальная', updated_at: '', items: [{ exercise_id: 'e1', target_sets: 3, superset_group: null }] }]
    expect(await rt.sync('u1')).toBe(false)
    rt.remove('L1')
    expect(h.ups).toEqual([]); expect(h.dels).toEqual([])
  })
})
