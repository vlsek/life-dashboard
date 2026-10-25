import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'

// BACKLOG 66.5в: тренировки без сети. Подход/упражнение (создать, править, удалить) пишутся через очередь офлайн-записей: онлайн — сразу, без сети —
// «принято локально» и видно в списке (наложение очереди), при появлении сети отправляются один раз. Id строк создаёт клиент.
const db = vi.hoisted(() => ({
  online: true,
  exercises: [] as any[],
  entries: [] as any[],
  inserts: 0,
  rejectInsert: false,
}))
vi.mock('./supabase', () => ({
  sb: {
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'u1', email: 'a@b.c' } } } }) },
    from: (table: string) => {
      const f: Record<string, unknown> = {}
      let op: 'select' | 'delete' | 'update' = 'select'
      let patch: any = null
      const netErr = { message: 'TypeError: Failed to fetch', status: 0 }
      const rows = () => (table === 'workout_exercises' ? db.exercises : table === 'workout_entries' ? db.entries : [])
      const chain: any = {
        select: () => chain,
        eq: (c: string, v: unknown) => ((f[c] = v), chain),
        match: (o: Record<string, unknown>) => (Object.assign(f, o), apply()),
        order: () => chain,
        limit: () => chain,
        maybeSingle: () => Promise.resolve({ data: table === 'profiles' ? { onboarded: true, workout_program: null } : null, error: null }),
        insert: (row: any) => {
          if (!db.online) return Promise.resolve({ error: netErr })
          if (db.rejectInsert) return Promise.resolve({ error: { code: '42501', message: 'permission denied' } })
          db.inserts++
          const arr = rows()
          if (arr.some((r) => r.id === row.id)) return Promise.resolve({ error: { code: '23505', message: 'duplicate key' } })
          arr.push({ created_at: '2026-10-20T00:00:00Z', ...row })
          return Promise.resolve({ error: null })
        },
        update: (p: any) => ((op = 'update'), (patch = p), chain),
        delete: () => ((op = 'delete'), chain),
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => {
          if (op === 'select') return Promise.resolve(db.online ? { data: rows(), error: null } : { data: null, error: netErr }).then(res, rej)
          return apply().then(res, rej)
        },
      }
      function apply() {
        if (!db.online) return Promise.resolve({ error: netErr })
        const arr = rows()
        if (op === 'update') for (const r of arr) if (r.id === f.id) Object.assign(r, patch)
        if (op === 'delete') {
          const keep = arr.filter((r) => r.id !== f.id)
          arr.length = 0
          arr.push(...keep)
          if (table === 'workout_exercises') db.entries = db.entries.filter((e) => e.exercise_id !== f.id)
        }
        return Promise.resolve({ error: null })
      }
      return chain
    },
  },
}))

import { useWorkouts } from './useWorkouts'
import { setOutboxForTests } from './outboxClient'
import { createOutbox, memoryStorage, type Outbox } from './offlineOutbox'
import { sb } from './supabase'

const input = (name: string): any => ({ name, category: '', tracks_weight: 'no', value_label: '', unit: '', tracks_duration: false, bilateral: false })
let box: Outbox
async function ready() {
  const wk = useWorkouts()
  await flushPromises()
  return wk
}

beforeEach(() => {
  localStorage.clear()
  db.online = true
  db.exercises = [{ id: 'e1', user_id: 'u1', name: 'Отжимания', category: null, tracks_weight: false, unit: '', value_label: 'Повторы', created_at: '2026-10-01T00:00:00Z' }]
  db.entries = []
  db.inserts = 0
  db.rejectInsert = false
  box = createOutbox({ client: sb as never, storage: memoryStorage(), isOnline: () => db.online })
  setOutboxForTests(box)
})

describe('тренировки без сети (66.5в)', () => {
  it('онлайн как раньше: подход сразу на сервере и в списке, очередь пуста', async () => {
    const wk = await ready()
    await wk.addEntry('e1', 'u1', { date: '2026-10-20', sets: [{ reps: 12 } as never], notes: null })
    expect(db.entries).toHaveLength(1)
    expect(wk.entries.value.map((e) => e.date)).toEqual(['2026-10-20'])
    expect(await box.list()).toEqual([])
  })

  it('нет сети: подход принят локально и виден в списке сразу; на сервере пока нет; при появлении сети уходит один раз', async () => {
    const wk = await ready()
    db.online = false
    await wk.addEntry('e1', 'u1', { date: '2026-10-20', sets: [{ reps: 12 } as never], notes: 'утро' })
    expect(db.entries).toHaveLength(0)
    expect(wk.entries.value).toHaveLength(1)
    expect(wk.entries.value[0].notes).toBe('утро')
    const keys = (await box.list()).map((e) => e.key)
    expect(keys).toHaveLength(1)
    expect(keys[0]).toMatch(/^workout_entries:/)
    db.online = true
    await box.flush()
    expect(db.entries).toHaveLength(1)
    expect(db.entries[0].id).toBe(keys[0].replace('workout_entries:', '')) // тот же клиентский id
    expect(await box.list()).toEqual([])
    await box.flush()
    expect(db.entries).toHaveLength(1) // повторный сброс дубля не даёт
  })

  it('нет сети: правка и удаление подхода — в списке сразу, на сервер уходят по порядку', async () => {
    const wk = await ready()
    await wk.addEntry('e1', 'u1', { date: '2026-10-20', sets: [{ reps: 5 } as never], notes: null })
    const id = db.entries[0].id
    db.online = false
    await wk.editEntry(id, { date: '2026-10-21', sets: [{ reps: 9 } as never], notes: 'х' })
    expect(wk.entries.value.find((e) => e.id === id)?.date).toBe('2026-10-21')
    expect(db.entries[0].date).toBe('2026-10-20')
    await wk.deleteEntry(id)
    expect(wk.entries.value.find((e) => e.id === id)).toBeUndefined()
    expect(db.entries).toHaveLength(1)
    db.online = true
    await box.flush()
    expect(db.entries).toHaveLength(0)
  })

  it('нет сети: новое упражнение появляется в списке; потом уходит на сервер с тем же id', async () => {
    const wk = await ready()
    db.online = false
    await wk.addExercise('u1', input('Подтягивания'), 'кг', 'Повторы')
    expect(wk.exercises.value.map((e) => e.name)).toContain('Подтягивания')
    expect(db.exercises).toHaveLength(1)
    const key = (await box.list())[0].key
    db.online = true
    await box.flush()
    expect(db.exercises.map((e) => e.name)).toContain('Подтягивания')
    expect(db.exercises.find((e) => e.name === 'Подтягивания')?.id).toBe(key.replace('workout_exercises:', ''))
  })

  it('нет сети: переименование и удаление упражнения; записи удалённого исчезают из списка', async () => {
    const wk = await ready()
    await wk.addEntry('e1', 'u1', { date: '2026-10-20', sets: [{ reps: 5 } as never], notes: null })
    db.online = false
    await wk.editExercise(wk.exercises.value[0], input('Отжимания узкие'), 'кг', 'Повторы')
    expect(wk.exercises.value[0].name).toBe('Отжимания узкие')
    await wk.deleteExercise('e1')
    expect(wk.exercises.value).toEqual([])
    expect(wk.entries.value).toEqual([])
    db.online = true
    await box.flush()
    expect(db.exercises).toEqual([])
  })

  it('сервер отказал (не сеть): честная ошибка, в очередь не попадает', async () => {
    const wk = await ready()
    db.rejectInsert = true
    await expect(wk.addEntry('e1', 'u1', { date: '2026-10-20', sets: [{ reps: 5 } as never], notes: null })).rejects.toBeTruthy()
    expect(await box.list()).toEqual([])
    expect(wk.entries.value).toEqual([])
  })
})
