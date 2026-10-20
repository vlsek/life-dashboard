import { beforeEach, describe, expect, it, vi } from 'vitest'

// BACKLOG 66.5а: вода без сети. Запись дня (daily_values) и строки журнала (water_log) идут через очередь офлайн-записей: без сети — «принято
// локально», при появлении сети — отправляются один раз (id строки журнала создаёт клиент). Файл один в один лежит в web-dashboard и web-header.
const db = vi.hoisted(() => ({
  online: true,
  store: {} as Record<string, number>,
  log: [] as { id: string; date: string; delta_ml: number }[],
  metric: null as any,
  rejectUpsert: false,
  inserts: 0,
}))
vi.mock('./supabase', () => ({
  sb: {
    from: (table: string) => {
      const f: Record<string, string> = {}
      let op: 'select' | 'delete' = 'select'
      const netErr = { message: 'TypeError: Failed to fetch', status: 0 }
      const chain: any = {
        select: () => chain,
        eq: (c: string, v: string) => ((f[c] = v), chain),
        match: (o: Record<string, string>) => (Object.assign(f, o), chain),
        order: () => chain,
        limit: () => chain,
        maybeSingle: () => {
          if (!db.online) return Promise.resolve({ data: null, error: netErr })
          return Promise.resolve({ data: table === 'daily_values' && f.date in db.store ? { value: db.store[f.date] } : null, error: null })
        },
        upsert: (row: any) => {
          if (!db.online) return Promise.resolve({ error: netErr })
          if (db.rejectUpsert) return Promise.resolve({ error: { code: '42501', message: 'permission denied' } })
          db.store[row.date] = row.value
          return Promise.resolve({ error: null })
        },
        insert: (row: any) => {
          if (!db.online) return Promise.resolve({ error: netErr })
          db.inserts++
          if (db.log.some((r) => r.id === row.id)) return Promise.resolve({ error: { code: '23505', message: 'duplicate key' } })
          db.log.push({ id: row.id, date: row.date, delta_ml: row.delta_ml })
          return Promise.resolve({ error: null })
        },
        delete: () => ((op = 'delete'), chain),
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => {
          if (table === 'water_log' && op === 'delete') {
            if (!db.online) return Promise.resolve({ error: netErr }).then(res, rej)
            db.log = db.log.filter((r) => r.id !== f.id)
            return Promise.resolve({ error: null }).then(res, rej)
          }
          return Promise.resolve({ data: table === 'metrics' && db.metric ? [db.metric] : [], error: null }).then(res, rej)
        },
      }
      return chain
    },
  },
}))

import { useWater } from './useWater'
import { setOutboxForTests } from './outboxClient'
import { createOutbox, memoryStorage, type Outbox } from './offlineOutbox'
import { sb } from './supabase'
import { todayStr } from './date'
import { t } from './i18n'

const D = todayStr()
const metric = (): any => ({ id: 'w1', user_id: 'u', name: 'Вода', icon: 'svg:droplet', type: 'number', unit: 'мл', goal_value: 2000, goal_direction: null, schedule: null, category_id: null, position: 0, active: true })
let box: Outbox
async function fresh() {
  db.metric = metric()
  const w = useWater()
  await w.init('u')
  return w
}
const pendingKeys = async () => (await box.list()).map((e) => e.key).sort()

beforeEach(() => {
  localStorage.setItem('site_lang', 'ru')
  localStorage.removeItem('wundo:u:' + D)
  db.online = true
  db.store = {}
  db.log = []
  db.rejectUpsert = false
  db.inserts = 0
  let n = 0
  vi.spyOn(globalThis.crypto, 'randomUUID').mockImplementation((() => 'id' + ++n) as never) // очередь тоже берёт randomUUID для своих записей, поэтому номера не считаем
  box = createOutbox({ client: sb as never, storage: memoryStorage(), isOnline: () => db.online })
  setOutboxForTests(box)
})

describe('вода без сети (66.5а)', () => {
  it('онлайн всё как раньше: запись сразу на сервере, очередь пуста', async () => {
    const w = await fresh()
    expect(await w.addMl(250, D)).toBe(250)
    await w.flushLog()
    expect(db.store[D]).toBe(250)
    expect(db.log.map((r) => r.delta_ml)).toEqual([250])
    expect(await box.list()).toEqual([])
  })

  it('нет сети: сумма и журнал принимаются локально, на сервере пока ничего; при появлении сети уходят один раз', async () => {
    const w = await fresh()
    expect(await w.addMl(250, D)).toBe(250) // день известен (загрузили онлайн)
    await w.flushLog()
    db.online = false
    expect(await w.addMl(300, D)).toBe(550) // 250 + 300 по последней известной сумме
    await w.flushLog()
    expect(w.todayMl.value).toBe(550)
    expect(db.store[D]).toBe(250) // сервер про 300 ещё не знает
    const keys = await pendingKeys()
    expect(keys).toHaveLength(2)
    expect(keys).toContain(`daily_values:${D}:w1`)
    expect(keys.filter((k) => k.startsWith('water_log:'))).toHaveLength(1)
    expect(w.dayLog(D).rows.map((r) => r.delta)).toEqual([300, 250]) // в журнале окна видно сразу
    db.online = true
    await box.flush()
    expect(db.store[D]).toBe(550)
    expect(db.log).toHaveLength(2)
    expect(new Set(db.log.map((r) => r.id)).size).toBe(2)
    expect(await box.list()).toEqual([])
  })

  it('серия нажатий без сети: в очереди одна запись суммы (последняя) и по строке журнала на каждое нажатие', async () => {
    const w = await fresh()
    db.online = false
    await w.addMl(100, D)
    await w.addMl(200, D)
    await w.addMl(300, D)
    await w.flushLog()
    const keys = await pendingKeys()
    expect(keys.filter((k) => k.startsWith('daily_values'))).toHaveLength(1)
    expect(keys.filter((k) => k.startsWith('water_log'))).toHaveLength(3)
    db.online = true
    await box.flush()
    expect(db.store[D]).toBe(600)
    expect(db.log).toHaveLength(3)
  })

  it('повторная отправка той же строки журнала не даёт дубль (клиентский id)', async () => {
    const w = await fresh()
    db.online = false
    await w.addMl(250, D)
    await w.flushLog()
    db.online = true
    await box.flush()
    await box.flush()
    expect(db.log).toHaveLength(1)
    // «сервер уже применил, а ответ потерялся»: та же вставка ещё раз — 23505 считается применённой
    const sentId = db.log[0].id
    const dup = await box.write({ key: `water_log:${sentId}`, table: 'water_log', op: 'insert', payload: { id: sentId, date: D, delta_ml: 250 } })
    expect(dup.status).toBe('sent')
    expect(db.log).toHaveLength(1)
  })

  it('«Отменить» без сети: сумма откатывается, строка журнала удаляется при появлении сети', async () => {
    const w = await fresh()
    await w.addMl(250, D)
    await w.flushLog()
    db.online = false
    expect(await w.undoLast(D)).toBe(0)
    await w.flushLog()
    expect(w.todayMl.value).toBe(0)
    db.online = true
    await box.flush()
    expect(db.store[D]).toBe(0)
    expect(db.log).toEqual([])
  })

  it('день не читался и нет сети: не «прибавляем к неизвестному» — понятная ошибка, ничего не ставим в очередь', async () => {
    const w = await fresh()
    db.online = false
    expect(await w.addMl(250, D.replace(/\d\d$/, '01') === D ? '2026-01-02' : '2026-01-01')).toBeNull() // прошлый день, суммы не знаем
    expect(w.saveError.value).toBe(t('dash_water_offline_unknown'))
    expect(await box.list()).toEqual([])
  })

  it('сервер отказал (не сеть): честная ошибка, в очередь не попадает', async () => {
    const w = await fresh()
    db.rejectUpsert = true
    expect(await w.addMl(250, D)).toBeNull()
    expect(w.saveError.value).toBeTruthy()
    expect(await box.list()).toEqual([])
  })
})
