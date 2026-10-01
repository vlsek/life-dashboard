import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POINTS_FLOAT, type PointsFloatDetail } from './pointsFloat'
import { undoKey } from './waterUndo'

// Сквозной сценарий «записал воду → отменил / поправил сумму» на заглушке БД с памятью (BACKLOG 12).
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

const floats: number[] = []
const onFloat = (e: Event) => floats.push((e as CustomEvent<PointsFloatDetail>).detail.delta)

beforeEach(() => {
  db.store = {}
  db.failWrite = false
  floats.length = 0
  localStorage.clear()
  window.addEventListener(POINTS_FLOAT, onFloat)
})
afterEach(() => window.removeEventListener(POINTS_FLOAT, onFloat))

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

describe('отмена и правка суммы + анимация баллов (норма 1500)', () => {
  it('набрал норму — «+1»; отмена, из-за которой норма перестала быть набранной, — «−1»; правка суммы через норму — тоже', async () => {
    const w = await fresh(1500)
    await w.addMl(1000, D)
    expect(floats).toEqual([])
    await w.addMl(600, D) // 1600 ≥ 1500
    expect(floats).toEqual([1])
    await w.undoLast(D) // назад к 1000
    expect(floats).toEqual([1, -1])
    await w.setTotal(2000, D)
    expect(floats).toEqual([1, -1, 1])
    await w.setTotal(100, D)
    expect(floats).toEqual([1, -1, 1, -1])
  })
})
