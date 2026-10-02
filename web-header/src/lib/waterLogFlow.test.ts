import { beforeEach, describe, expect, it, vi } from 'vitest'
import { undoKey } from './waterUndo'

// Серверный журнал воды (water_log, миграция 036) на заглушке БД с памятью: запись, время, откат, загрузка, «таблицы нет».
const db = vi.hoisted(() => ({
  store: {} as Record<string, number>,
  log: [] as any[],
  metric: null as any,
  logMissing: false,
  logFail: false,
  deletes: [] as any[],
  inserts: [] as any[],
  seq: 0,
}))
vi.mock('./supabase', () => ({
  sb: {
    from: (table: string) => {
      const f: Record<string, string> = {}
      let op: 'select' | 'delete' = 'select'
      let wl: any = null
      const chain: any = {
        select: (cols?: string) => {
          if (wl && table === 'water_log') return chain // select после insert — вернуть вставленную строку
          void cols
          return chain
        },
        eq: (c: string, v: string) => ((f[c] = v), chain),
        order: () => chain,
        limit: () => chain,
        single: () => {
          if (db.logMissing) return Promise.resolve({ data: null, error: { code: '42P01', message: 'relation "water_log" does not exist' } })
          if (db.logFail) return Promise.resolve({ data: null, error: { code: 'XX000', message: 'boom' } })
          return Promise.resolve({ data: wl, error: null })
        },
        insert: (row: any) => {
          db.inserts.push(row)
          wl = { id: 'log' + ++db.seq, ...row }
          if (!db.logMissing && !db.logFail) db.log.push(wl)
          return chain
        },
        delete: () => ((op = 'delete'), chain),
        maybeSingle: () => Promise.resolve({ data: table === 'daily_values' && f.date in db.store ? { value: db.store[f.date] } : null, error: null }),
        upsert: (row: any) => {
          db.store[row.date] = row.value
          return Promise.resolve({ error: null })
        },
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => {
          let out: any
          if (table === 'water_log' && op === 'delete') {
            db.deletes.push({ id: f.id, user_id: f.user_id })
            db.log = db.log.filter((r) => r.id !== f.id)
            out = { error: null }
          } else if (table === 'water_log') {
            out = db.logMissing
              ? { data: null, error: { code: 'PGRST205', message: "Could not find the table 'public.water_log' in the schema cache" } }
              : { data: db.log.filter((r) => r.date === f.date).sort((a, b) => (a.drank_at < b.drank_at ? 1 : -1)), error: null }
          } else {
            out = { data: table === 'metrics' && db.metric ? [db.metric] : [], error: null }
          }
          return Promise.resolve(out).then(res, rej)
        },
      }
      return chain
    },
  },
}))

import { useWater } from './useWater'
import { todayStr } from './date'
import { timeToMs } from './waterLog'

const D = todayStr()
const PAST = '2026-09-01'
const metric = (): any => ({ id: 'w1', user_id: 'u', name: 'Вода', icon: 'svg:droplet', type: 'number', unit: 'мл', goal_value: 2000, goal_direction: null, schedule: null, category: null, position: 0, active: true })
async function fresh() {
  db.metric = metric()
  const w = useWater()
  await w.init('u')
  return w
}

beforeEach(() => {
  db.store = {}
  db.log = []
  db.logMissing = false
  db.logFail = false
  db.deletes = []
  db.inserts = []
  db.seq = 0
  localStorage.clear()
})

describe('useWater + water_log: запись', () => {
  it('добавление пишет строку журнала: дата, +дельта, сумма после, вид add, время «сейчас»', async () => {
    const w = await fresh()
    const t0 = Date.now()
    await w.addMl(250, D)
    await w.flushLog()
    expect(db.inserts).toHaveLength(1)
    const row = db.inserts[0]
    expect(row).toMatchObject({ user_id: 'u', date: D, delta_ml: 250, total_after_ml: 250, kind: 'add' })
    expect(Date.parse(row.drank_at)).toBeGreaterThanOrEqual(t0)
    expect(Date.parse(row.drank_at)).toBeLessThanOrEqual(Date.now())
    expect(db.store[D]).toBe(250)
  })

  it('выбранное время используется как есть; для прошлого дня без выбора — 12:00', async () => {
    const w = await fresh()
    const chosen = timeToMs(D, '07:30') as number
    await w.addMl(200, D, chosen)
    await w.addMl(300, PAST)
    await w.flushLog()
    expect(Date.parse(db.inserts[0].drank_at)).toBe(chosen)
    expect(Date.parse(db.inserts[1].drank_at)).toBe(timeToMs(PAST, '12:00'))
    expect(db.inserts[1].date).toBe(PAST)
  })

  it('правка суммы вниз пишется как edit с отрицательной дельтой; «то же значение» — без записи', async () => {
    const w = await fresh()
    await w.addMl(500, D)
    await w.setTotal(300, D)
    await w.setTotal(300, D)
    await w.flushLog()
    expect(db.inserts.map((r) => [r.kind, r.delta_ml, r.total_after_ml])).toEqual([['add', 500, 500], ['edit', -200, 300]])
  })
})

describe('useWater + water_log: отмена и загрузка', () => {
  it('«Отменить» удаляет строку журнала именно этой записи (по id, только свои)', async () => {
    const w = await fresh()
    await w.addMl(200, D)
    await w.addMl(300, D)
    await w.flushLog()
    expect(db.log).toHaveLength(2)
    const lastId = db.log[1].id
    expect(await w.undoLast(D)).toBe(200)
    await w.flushLog()
    expect(db.deletes).toEqual([{ id: lastId, user_id: 'u' }])
    expect(db.log.map((r) => r.delta_ml)).toEqual([200])
  })

  it('отмена сразу после добавления дожидается записи журнала и всё равно удаляет строку', async () => {
    const w = await fresh()
    await w.addMl(250, D) // журнал пишется в фоне — id ещё может не быть привязан
    expect(await w.undoLast(D)).toBe(0)
    await w.flushLog()
    expect(db.log).toEqual([])
    expect(db.deletes).toHaveLength(1)
  })

  it('loadDayLog читает журнал дня из БД: источник server, от новых к старым', async () => {
    const w = await fresh()
    db.log = [
      { id: 'a', date: D, drank_at: '2026-10-02T08:00:00.000Z', delta_ml: 200, total_after_ml: 200, kind: 'add' },
      { id: 'b', date: D, drank_at: '2026-10-02T12:00:00.000Z', delta_ml: 300, total_after_ml: 500, kind: 'add' },
      { id: 'c', date: '2020-01-01', drank_at: '2020-01-01T10:00:00.000Z', delta_ml: 999, total_after_ml: 999, kind: 'add' },
    ]
    await w.loadDayLog(D)
    const view = w.dayLog(D)
    expect(view.source).toBe('server')
    expect(view.rows.map((r) => r.id)).toEqual(['b', 'a'])
    expect(w.dayLog('2020-01-01').rows).toHaveLength(0) // другой день не загружен — запасной (пустой) журнал
  })

  it('новая запись сразу видна в журнале дня без перезагрузки', async () => {
    const w = await fresh()
    await w.addMl(250, D)
    await w.flushLog()
    const view = w.dayLog(D)
    expect(view.source).toBe('server')
    expect(view.rows.map((r) => r.delta)).toEqual([250])
  })

  it('«Отменить» убирает строку и из показанного журнала', async () => {
    const w = await fresh()
    await w.addMl(200, D)
    await w.addMl(300, D)
    await w.flushLog()
    await w.undoLast(D)
    await w.flushLog()
    expect(w.dayLog(D).rows.map((r) => r.delta)).toEqual([200])
  })
})

describe('useWater + water_log: миграция 036 не применена или сбой журнала', () => {
  it('таблицы нет: основная запись работает, журнал — запасной (записи этого устройства), повторно таблицу не дёргаем', async () => {
    db.logMissing = true
    const w = await fresh()
    expect(await w.addMl(250, D)).toBe(250)
    await w.flushLog()
    expect(db.store[D]).toBe(250)
    const view = w.dayLog(D)
    expect(view.source).toBe('local')
    expect(view.rows.map((r) => r.delta)).toEqual([250])
    const attempts = db.inserts.length
    await w.addMl(100, D)
    await w.flushLog()
    expect(db.inserts.length).toBe(attempts) // «таблицы нет» запомнили — вставок больше нет
    expect(db.store[D]).toBe(350)
    await w.loadDayLog(D) // и читать не пытаемся, ничего не падает
    expect(w.dayLog(D).source).toBe('local')
  })

  it('прочий сбой журнала не ломает воду и не считается «нет таблицы» — следующая запись пробует снова', async () => {
    db.logFail = true
    const w = await fresh()
    expect(await w.addMl(250, D)).toBe(250)
    await w.flushLog()
    expect(db.store[D]).toBe(250)
    expect(w.dayLog(D).source).toBe('local')
    db.logFail = false
    await w.addMl(100, D)
    await w.flushLog()
    expect(db.log).toHaveLength(1)
    expect(db.log[0]).toMatchObject({ delta_ml: 100, total_after_ml: 350 })
  })

  it('запись стека «Отменить» хранит id строки журнала и переживает перезагрузку', async () => {
    const w = await fresh()
    await w.addMl(250, D)
    await w.flushLog()
    const saved = JSON.parse(localStorage.getItem(undoKey('u', D)) as string)
    expect(saved[0].logId).toBe(db.log[0].id)
  })
})
