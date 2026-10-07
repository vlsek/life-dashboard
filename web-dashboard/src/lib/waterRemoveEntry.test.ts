import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MAX_DAY_ML, removeRowFromStack, stackIndexOfRow, type UndoEntry } from './waterUndo'

// «Крестик» у записи журнала воды (BACKLOG 23:17): удалить ИМЕННО эту запись — сумма дня уменьшается на её изменение, более поздние шаги «Отменить»
// сдвигаются на то же число (цепочка не ломается), строка water_log удаляется. Файл один в один лежит в web-dashboard и web-header (общий код воды).

// Серверный журнал воды (water_log) на заглушке БД с памятью — та же, что в waterLogFlow.test.ts.
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
const metric = (): any => ({ id: 'w1', user_id: 'u', name: 'Вода', icon: 'svg:droplet', type: 'number', unit: 'мл', goal_value: 2000, goal_direction: null, schedule: null, category: null, position: 0 })
async function fresh() {
  db.metric = metric()
  const w = useWater()
  await w.init('u')
  return w
}
const T = (hhmm: string) => timeToMs(D, hhmm) as number
async function addThree(w: Awaited<ReturnType<typeof fresh>>) {
  await w.addMl(250, D, T('08:00')) // log1: 0 → 250
  await w.addMl(300, D, T('09:00')) // log2: 250 → 550
  await w.addMl(200, D, T('10:00')) // log3: 550 → 750
  await w.flushLog()
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

const e = (prev: number, next: number, at?: number, logId?: string): UndoEntry => ({ prev, next, ...(at !== undefined ? { at } : {}), ...(logId ? { logId } : {}) })

describe('removeRowFromStack (чистая функция)', () => {
  const stack = [e(0, 250, 1, 'a'), e(250, 550, 2, 'b'), e(550, 750, 3, 'c')]

  it('запись из СЕРЕДИНЫ: сумма минус её изменение, следующие записи сдвигаются, предыдущие — нет', () => {
    const r = removeRowFromStack(stack, { id: 'b', at: 2, delta: 300 }, 750)
    expect(r.total).toBe(450)
    expect(r.index).toBe(1)
    expect(r.stack).toEqual([e(0, 250, 1, 'a'), e(250, 450, 3, 'c')])
  })

  it('последняя запись: цепочка заканчивается на новой сумме, отмена остаётся доступной', () => {
    const r = removeRowFromStack(stack, { id: 'c', at: 3, delta: 200 }, 750)
    expect(r.total).toBe(550)
    expect(r.stack).toEqual([e(0, 250, 1, 'a'), e(250, 550, 2, 'b')])
    expect(r.stack[r.stack.length - 1].next).toBe(r.total)
  })

  it('первая запись: вся цепочка сдвигается вниз', () => {
    const r = removeRowFromStack(stack, { id: 'a', at: 1, delta: 250 }, 750)
    expect(r.total).toBe(500)
    expect(r.stack).toEqual([e(0, 300, 2, 'b'), e(300, 500, 3, 'c')])
  })

  it('запись с минусом (правка суммы вниз): после удаления сумма ВЫРАСТАЕТ', () => {
    const s = [e(0, 500, 1, 'a'), e(500, 300, 2, 'b')]
    const r = removeRowFromStack(s, { id: 'b', at: 2, delta: -200 }, 300)
    expect(r.total).toBe(500)
    expect(r.stack).toEqual([e(0, 500, 1, 'a')])
  })

  it('ниже нуля не уходит и выше потолка дня тоже', () => {
    expect(removeRowFromStack([e(0, 500, 1, 'a'), e(500, 100, 2, 'b')], { id: 'a', at: 1, delta: 500 }, 100)).toMatchObject({ total: 0, stack: [e(0, 0, 2, 'b')] })
    expect(removeRowFromStack([e(0, 100, 1, 'a')], { id: 'a', at: 1, delta: -MAX_DAY_ML }, MAX_DAY_ML).total).toBe(MAX_DAY_ML)
  })

  it('записи нет в стеке (добавлена с другого устройства): сдвигаются только сделанные ПОЗЖЕ неё по времени', () => {
    const s = [e(0, 100, 10), e(100, 400, 30)]
    const r = removeRowFromStack(s, { id: 'srv', at: 20, delta: 50 }, 400)
    expect(r.index).toBe(-1)
    expect(r.total).toBe(350)
    expect(r.stack).toEqual([e(0, 100, 10), e(50, 350, 30)])
  })

  it('поиск записи: по id строки БД, иначе по времени и изменению (запись только этого устройства)', () => {
    expect(stackIndexOfRow(stack, { id: 'c', at: 999, delta: 1 })).toBe(2)
    expect(stackIndexOfRow([e(0, 250, 7), e(250, 300, 8)], { id: 'local:8', at: 8, delta: 50 })).toBe(1)
    expect(stackIndexOfRow(stack, { id: 'zzz', at: 99, delta: 5 })).toBe(-1)
  })

  it('исходный стек не меняется', () => {
    const copy = JSON.parse(JSON.stringify(stack))
    removeRowFromStack(stack, { id: 'a', at: 1, delta: 250 }, 750)
    expect(stack).toEqual(copy)
  })
})

describe('useWater.removeLogEntry: сумма дня, журнал и «Отменить»', () => {
  it('запись из середины: день 750 → 450, строка БД удалена, «Отменить» разматывает остальные шаги по порядку', async () => {
    const w = await fresh()
    await addThree(w)
    expect(db.store[D]).toBe(750)
    expect(await w.removeLogEntry(D, 'log2')).toBe(450)
    await w.flushLog()
    expect(db.store[D]).toBe(450)
    expect(db.deletes).toEqual([{ id: 'log2', user_id: 'u' }])
    expect(db.log.map((r) => r.id)).toEqual(['log1', 'log3'])
    expect(w.dayLog(D).rows.map((r) => r.id)).toEqual(['log3', 'log1'])
    expect(w.canUndo(D, 450)).toBe(true)
    expect(await w.undoLast(D)).toBe(250) // отменили +200 (log3)
    expect(await w.undoLast(D)).toBe(0) // отменили +250 (log1)
    await w.flushLog()
    expect(db.log).toEqual([])
  })

  it('последняя запись: день 750 → 550 и «Отменить» продолжает работать', async () => {
    const w = await fresh()
    await addThree(w)
    expect(await w.removeLogEntry(D, 'log3')).toBe(550)
    expect(w.canUndo(D, 550)).toBe(true)
    expect(await w.undoLast(D)).toBe(250)
  })

  it('первая запись: день 750 → 500, остальные записи сдвинуты', async () => {
    const w = await fresh()
    await addThree(w)
    expect(await w.removeLogEntry(D, 'log1')).toBe(500)
    expect(await w.undoLast(D)).toBe(300)
    expect(await w.undoLast(D)).toBe(0)
  })

  it('удаление записи-правки суммы (с минусом) возвращает убранную воду', async () => {
    const w = await fresh()
    await w.addMl(500, D, T('08:00'))
    await w.setTotal(300, D, T('09:00'))
    await w.flushLog()
    const edit = w.dayLog(D).rows.find((r) => r.delta === -200)!
    expect(await w.removeLogEntry(D, edit.id)).toBe(500)
    expect(db.store[D]).toBe(500)
  })

  it('сумма не уходит ниже нуля', async () => {
    const w = await fresh()
    await w.addMl(500, D, T('08:00'))
    await w.setTotal(100, D, T('09:00'))
    await w.flushLog()
    expect(await w.removeLogEntry(D, 'log1')).toBe(0)
    expect(db.store[D]).toBe(0)
  })

  it('неизвестная запись: ничего не меняется', async () => {
    const w = await fresh()
    await addThree(w)
    expect(await w.removeLogEntry(D, 'нет-такой')).toBeNull()
    expect(db.store[D]).toBe(750)
    expect(db.deletes).toEqual([])
  })

  it('таблицы журнала нет (запись только этого устройства): удаляется из стека, в БД ничего не удаляется', async () => {
    db.logMissing = true
    const w = await fresh()
    await w.addMl(250, D, T('08:00'))
    await w.addMl(300, D, T('09:00'))
    await w.flushLog()
    const view = w.dayLog(D)
    expect(view.source).toBe('local')
    expect(view.rows.map((r) => r.delta)).toEqual([300, 250])
    expect(await w.removeLogEntry(D, view.rows[1].id)).toBe(300) // убрали +250 (первую)
    expect(db.deletes).toEqual([])
    expect(w.dayLog(D).rows.map((r) => r.delta)).toEqual([300])
    expect(w.canUndo(D, 300)).toBe(true)
  })

  it('идёт в очереди записей: удаление сразу после нажатий «+» считает от настоящей суммы', async () => {
    const w = await fresh()
    await w.addMl(250, D, T('08:00'))
    await w.flushLog()
    const pending = w.addMl(500, D, T('09:00'))
    const removed = w.removeLogEntry(D, 'log1')
    await pending
    expect(await removed).toBe(500) // 250 + 500 − 250
    expect(db.store[D]).toBe(500)
  })
})
