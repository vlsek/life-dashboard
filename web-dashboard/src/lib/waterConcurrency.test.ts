import { beforeEach, describe, expect, it, vi } from 'vitest'
import { watch } from 'vue'

// BACKLOG 24 🐞 «23:16 — вода по «+200» добавлялась неправильно; при обновлении подтянулась куча нажатий».
// Запись воды = «прочитать значение дня → прибавить → записать». Раньше быстрые нажатия запускали такие цепочки параллельно
// (все читали одно и то же старое значение, журнал получал строку на каждое нажатие), а число и анимация менялись только после
// сетевого круга. Теперь записи идут в очереди, а «сегодня» обновляется сразу. Заглушка БД с задержкой «сети» и сбоями записи.
const db = vi.hoisted(() => ({
  store: {} as Record<string, number>,
  inserts: [] as any[],
  metric: null as any,
  seq: 0,
  latency: 8,
  upserts: 0,
  failUpsertOn: new Set<number>(),
  active: 0, // сколько обращений к daily_values выполняется прямо сейчас
  maxActive: 0,
}))
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

vi.mock('./supabase', () => ({
  sb: {
    from: (table: string) => {
      const f: Record<string, string> = {}
      let inserted: any = null
      const chain: any = {
        select: () => chain,
        eq: (c: string, v: string) => ((f[c] = v), chain),
        order: () => chain,
        limit: () => chain,
        single: () => Promise.resolve({ data: inserted, error: null }),
        insert: (row: any) => {
          db.inserts.push(row)
          inserted = { id: 'log' + ++db.seq, ...row }
          return chain
        },
        delete: () => chain,
        maybeSingle: async () => {
          if (table === 'daily_values') {
            db.maxActive = Math.max(db.maxActive, ++db.active)
            await sleep(db.latency) // сетевой круг чтения
            db.active--
            return { data: f.date in db.store ? { value: db.store[f.date] } : null, error: null }
          }
          return { data: null, error: null }
        },
        upsert: async (row: any) => {
          const n = ++db.upserts
          db.maxActive = Math.max(db.maxActive, ++db.active)
          await sleep(db.latency) // сетевой круг записи
          db.active--
          if (db.failUpsertOn.has(n)) return { error: { message: 'boom' } }
          db.store[row.date] = row.value
          return { error: null }
        },
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
          Promise.resolve({ data: table === 'metrics' && db.metric ? [db.metric] : [], error: null }).then(res, rej),
      }
      return chain
    },
  },
}))

import { useWater } from './useWater'
import { todayStr } from './date'

const D = todayStr()
const PAST = '2026-09-01'
const metric = (): any => ({ id: 'w1', user_id: 'u', name: 'Вода', icon: 'svg:droplet', type: 'number', unit: 'мл', goal_value: 2000, goal_direction: null, schedule: null, category: null, position: 0, active: true })
async function fresh(startMl?: number) {
  if (startMl !== undefined) db.store[D] = startMl
  db.metric = metric()
  const w = useWater()
  await w.init('u')
  return w
}

beforeEach(() => {
  db.store = {}
  db.inserts = []
  db.seq = 0
  db.upserts = 0
  db.failUpsertOn = new Set()
  db.active = 0
  db.maxActive = 0
  localStorage.clear()
})

describe('useWater: серия быстрых нажатий «+200»', () => {
  it('три нажатия подряд дают ровно 600 мл (раньше затирали друг друга и выходило 200)', async () => {
    const w = await fresh()
    const results = await Promise.all([w.addMl(200, D), w.addMl(200, D), w.addMl(200, D)])
    expect(results).toEqual([200, 400, 600])
    expect(db.store[D]).toBe(600)
    expect(w.todayMl.value).toBe(600)
  })

  it('в журнал воды идёт по строке на нажатие, и суммы «после» сходятся: 200 → 400 → 600', async () => {
    const w = await fresh()
    await Promise.all([w.addMl(200, D), w.addMl(200, D), w.addMl(200, D)])
    await w.flushLog()
    expect(db.inserts.map((r) => [r.delta_ml, r.total_after_ml])).toEqual([
      [200, 200],
      [200, 400],
      [200, 600],
    ])
  })

  it('считает от текущего значения дня, а не от нуля', async () => {
    const w = await fresh(500)
    expect(w.todayMl.value).toBe(500)
    await Promise.all([w.addMl(250, D), w.addMl(250, D)])
    expect(db.store[D]).toBe(1000)
    expect(w.todayMl.value).toBe(1000)
  })

  it('записи идут строго по одной: к БД никогда не обращаются два задания одновременно', async () => {
    const w = await fresh()
    db.maxActive = 0
    await Promise.all([w.addMl(100, D), w.addMl(100, D), w.addMl(100, D), w.addMl(100, D)])
    expect(db.upserts).toBe(4)
    expect(db.store[D]).toBe(400)
    expect(db.maxActive).toBe(1) // без очереди было бы 4 одновременных чтения/записи
  })
})

describe('useWater: число меняется сразу (оптимистично)', () => {
  it('сразу после нажатия, ещё до ответа сети, значение уже выросло', async () => {
    const w = await fresh()
    const p = w.addMl(200, D)
    expect(w.todayMl.value).toBe(200)
    const p2 = w.addMl(200, D)
    expect(w.todayMl.value).toBe(400)
    await Promise.all([p, p2])
    expect(w.todayMl.value).toBe(400)
  })

  it('при серии нажатий число только растёт — не «прыгает назад» на подтверждённое значение', async () => {
    const w = await fresh()
    const seen: number[] = []
    watch(w.todayMl, (v) => seen.push(v), { flush: 'sync' })
    await Promise.all([w.addMl(200, D), w.addMl(200, D), w.addMl(200, D)])
    expect(seen[0]).toBe(200)
    for (let i = 1; i < seen.length; i++) expect(seen[i]).toBeGreaterThanOrEqual(seen[i - 1])
    expect(seen[seen.length - 1]).toBe(600)
  })

  it('вода за другой день сегодняшнее число не трогает', async () => {
    const w = await fresh()
    const p = w.addMl(200, PAST)
    expect(w.todayMl.value).toBe(0)
    await p
    expect(db.store[PAST]).toBe(200)
    expect(w.todayMl.value).toBe(0)
  })
})

describe('useWater: сбой записи', () => {
  it('не записалось — оптимистичная добавка откатывается, возвращается null, ошибка показана', async () => {
    db.failUpsertOn.add(1)
    const w = await fresh()
    const p = w.addMl(200, D)
    expect(w.todayMl.value).toBe(200)
    expect(await p).toBeNull()
    expect(w.todayMl.value).toBe(0)
    expect(db.store[D]).toBeUndefined()
    expect(w.saveError.value).toContain('boom')
    // очередь не заклинило: следующее нажатие работает
    expect(await w.addMl(200, D)).toBe(200)
    expect(w.todayMl.value).toBe(200)
  })

  it('сбой средней записи в серии: первая и третья проходят, число сходится с базой', async () => {
    db.failUpsertOn.add(2)
    const w = await fresh()
    const res = await Promise.all([w.addMl(200, D), w.addMl(200, D), w.addMl(200, D)])
    expect(res).toEqual([200, null, 400])
    expect(db.store[D]).toBe(400)
    expect(w.todayMl.value).toBe(400)
  })

  it('неудавшаяся запись не попадает в журнал воды', async () => {
    db.failUpsertOn.add(1)
    const w = await fresh()
    await w.addMl(200, D)
    await w.flushLog()
    expect(db.inserts).toHaveLength(0)
  })
})

describe('useWater: отмена и правка суммы встают в ту же очередь', () => {
  it('«Отменить» сразу после нажатия отменяет именно это добавление', async () => {
    const w = await fresh()
    const add = w.addMl(200, D)
    const undo = w.undoLast(D)
    expect(await add).toBe(200)
    expect(await undo).toBe(0)
    expect(db.store[D]).toBe(0)
    expect(w.todayMl.value).toBe(0)
  })

  it('правка суммы после нажатий применяется после них и не затирается ими', async () => {
    const w = await fresh()
    const res = await Promise.all([w.addMl(200, D), w.addMl(200, D), w.setTotal(1000, D)])
    expect(res).toEqual([200, 400, 1000])
    expect(db.store[D]).toBe(1000)
    expect(w.todayMl.value).toBe(1000)
  })

  it('нажатие, поставленное после правки суммы, считается от новой суммы', async () => {
    const w = await fresh(300)
    const res = await Promise.all([w.setTotal(1000, D), w.addMl(200, D)])
    expect(res).toEqual([1000, 1200])
    expect(w.todayMl.value).toBe(1200)
  })
})
