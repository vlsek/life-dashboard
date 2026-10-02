import { beforeEach, describe, expect, it, vi } from 'vitest'
import { undoKey } from './waterUndo'

// Сквозной сценарий «записал воду → отменил / поправил сумму» на заглушке БД с памятью (BACKLOG 12; копия теста Дашборда без анимации баллов).
const db = vi.hoisted(() => ({ store: {} as Record<string, number>, metric: null as any, failWrite: false }))
vi.mock('./supabase', () => ({
  sb: {
    from: (table: string) => {
      const f: Record<string, string> = {}
      const chain: any = {
        select: () => chain,
        eq: (c: string, v: string) => ((f[c] = v), chain),
        order: () => chain,
        limit: () => chain,
        maybeSingle: () => Promise.resolve({ data: table === 'daily_values' && f.date in db.store ? { value: db.store[f.date] } : null, error: null }),
        upsert: (row: any) => {
          if (db.failWrite) return Promise.resolve({ error: { message: 'boom' } })
          db.store[row.date] = row.value
          return Promise.resolve({ error: null })
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
const metric = (goal: number | null = null): any => ({ id: 'w1', user_id: 'u', name: 'Вода', icon: 'svg:droplet', type: 'number', unit: 'мл', goal_value: goal, goal_direction: null, schedule: null, category_id: null, position: 1 })
async function fresh(goal: number | null = null) {
  db.metric = metric(goal)
  const w = useWater()
  await w.init('u')
  return w
}

beforeEach(() => {
  db.store = {}
  db.failWrite = false
  localStorage.clear()
})

describe('useWater: отмена последнего добавления', () => {
  it('добавил 200 и 500 — отмена откатывает по шагам: 700 → 200 → 0, дальше отменять нечего', async () => {
    const w = await fresh()
    await w.addMl(200, D)
    await w.addMl(500, D)
    expect(db.store[D]).toBe(700)
    expect(w.canUndo(D, 700)).toBe(true)
    expect(await w.undoLast(D)).toBe(200)
    expect(db.store[D]).toBe(200)
    expect(w.todayMl.value).toBe(200)
    expect(await w.undoLast(D)).toBe(0)
    expect(db.store[D]).toBe(0)
    expect(w.canUndo(D, 0)).toBe(false)
    expect(await w.undoLast(D)).toBeNull()
  })

  it('карандашик: правка суммы за день пишет значение напрямую и тоже отменяется', async () => {
    const w = await fresh()
    await w.addMl(300, D)
    expect(await w.setTotal(1500, D)).toBe(1500)
    expect(db.store[D]).toBe(1500)
    expect(await w.undoLast(D)).toBe(300)
    expect(db.store[D]).toBe(300)
    expect(await w.setTotal(300, D)).toBe(300) // то же значение — записи и шага в журнале нет
    expect(await w.setTotal(-1, D)).toBeNull()
    expect(await w.setTotal(NaN, D)).toBeNull()
  })

  it('значение дня изменили в другом месте — отмена отказывает, ничего не затирает и сбрасывает журнал', async () => {
    const w = await fresh()
    await w.addMl(200, D)
    db.store[D] = 900 // другое устройство
    expect(await w.undoLast(D)).toBeNull()
    expect(db.store[D]).toBe(900)
    expect(w.canUndo(D, 900)).toBe(false)
    expect(await w.undoLast(D)).toBeNull()
  })

  it('журнал переживает перезагрузку (localStorage) и ведётся отдельно по дням', async () => {
    const w = await fresh()
    await w.addMl(250, D)
    await w.addMl(100, '2026-01-02')
    const w2 = await fresh() // «перезагрузка страницы»
    expect(w2.canUndo(D, 250)).toBe(true)
    expect(await w2.undoLast(D)).toBe(0)
    expect(localStorage.getItem(undoKey('u', D))).toBeNull()
    expect(w2.canUndo('2026-01-02', 100)).toBe(false) // слишком старый день вычищен при загрузке
  })

  it('сбой записи при отмене: значение и журнал не трогаются, шаг остаётся', async () => {
    const w = await fresh()
    await w.addMl(400, D)
    db.failWrite = true
    expect(await w.undoLast(D)).toBeNull()
    expect(w.saveError.value).toBeTruthy()
    db.failWrite = false
    expect(w.canUndo(D, 400)).toBe(true)
    expect(await w.undoLast(D)).toBe(0)
  })

  it('без метрики воды всё возвращает null', async () => {
    db.metric = undefined
    const w = useWater()
    await w.init('u')
    expect(await w.undoLast(D)).toBeNull()
    expect(await w.setTotal(100, D)).toBeNull()
  })
})

// «Время приема воды» (BACKLOG 2.2, срез без БД): журнал дня берётся из стека «Отменить», в записях есть время.
describe('useWater: журнал добавлений со временем', () => {
  it('каждое добавление пишется со временем «сейчас» и изменением; журнал растёт по порядку', async () => {
    const w = await fresh()
    const before = Date.now()
    await w.addMl(200, D)
    await w.addMl(300, D)
    const log = w.dayLog(D)
    expect(log.map((e) => [e.prev, e.next])).toEqual([[0, 200], [200, 500]])
    for (const e of log) {
      expect(e.at).toBeGreaterThanOrEqual(before)
      expect(e.at).toBeLessThanOrEqual(Date.now())
    }
  })

  it('отмена убирает последнюю запись из журнала; запись со временем переживает перезагрузку (localStorage)', async () => {
    const w = await fresh()
    await w.addMl(200, D)
    await w.addMl(300, D)
    await w.undoLast(D)
    expect(w.dayLog(D).map((e) => e.next)).toEqual([200])
    const saved = JSON.parse(localStorage.getItem(undoKey('u', D)) as string)
    expect(saved).toHaveLength(1)
    expect(typeof saved[0].at).toBe('number')
    const w2 = await fresh() // «перезагрузка»: стек читается из localStorage
    expect(w2.dayLog(D).map((e) => e.next)).toEqual([200])
    expect(w2.dayLog(D)[0].at).toBe(saved[0].at)
  })

  it('правка суммы за день тоже попадает в журнал (с уменьшением), «нет изменения» — нет', async () => {
    const w = await fresh()
    await w.addMl(500, D)
    await w.setTotal(300, D)
    await w.setTotal(300, D) // то же значение — записи не будет
    const log = w.dayLog(D)
    expect(log.map((e) => [e.prev, e.next])).toEqual([[0, 500], [500, 300]])
  })

  it('журнал разных дат не смешивается; для даты без записей — пусто', async () => {
    const w = await fresh()
    await w.addMl(200, D)
    expect(w.dayLog('2020-01-01')).toEqual([])
  })
})
