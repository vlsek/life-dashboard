import { beforeEach, describe, expect, it, vi } from 'vitest'

// «Отслеживать воду» (BACKLOG 932): флаг profiles.track_water (миграция 055). Файл один в один лежит в web-dashboard и web-header (общий код).
const db = vi.hoisted(() => ({
  row: null as null | { track_water?: boolean | null },
  selectError: null as null | { message: string },
  upsertError: null as null | { message: string },
  selects: 0,
  upserts: [] as unknown[],
  throwOnSelect: false,
}))
vi.mock('./supabase', () => ({
  sb: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => {
            db.selects++
            if (db.throwOnSelect) throw new Error('offline')
            return { data: db.row, error: db.selectError }
          },
        }),
      }),
      upsert: async (payload: unknown) => {
        db.upserts.push(payload)
        return { error: db.upsertError }
      },
    }),
  },
}))

import { DATA_CHANGED } from './events'
import { WATER_TRACKING_EVENT, _resetTrackWaterForTests, cachedTrackWater, dropWaterIfOff, ensureTrackWater, saveTrackWater, trackWater } from './waterTracking'

const water = { id: 'w', name: 'Вода', icon: '💧', type: 'number', goal_value: 2000, position: 1 }
const water2 = { id: 'w2', name: 'Water (tea)', icon: null, type: 'number', goal_value: 500, position: 5 }
const habit = { id: 'h', name: 'Зарядка', icon: null, type: 'boolean', goal_value: null, position: 2 }

beforeEach(() => {
  localStorage.clear()
  db.row = null
  db.selectError = null
  db.upsertError = null
  db.selects = 0
  db.upserts = []
  db.throwOnSelect = false
  _resetTrackWaterForTests()
})

describe('учёт воды: чтение флага', () => {
  it('по умолчанию включён: нет кэша, нет профиля', async () => {
    expect(cachedTrackWater('u1')).toBe(true)
    expect(await ensureTrackWater('u1')).toBe(true)
    expect(trackWater.value).toBe(true)
  })

  it('профиль говорит «выключено» — состояние и кэш устройства меняются', async () => {
    db.row = { track_water: false }
    expect(await ensureTrackWater('u1')).toBe(false)
    expect(trackWater.value).toBe(false)
    expect(cachedTrackWater('u1')).toBe(false)
    expect(localStorage.getItem('track_water_off:u1')).toBe('1')
  })

  it('профиль говорит «включено» — выключенный ранее кэш снимается', async () => {
    localStorage.setItem('track_water_off:u1', '1')
    db.row = { track_water: true }
    expect(await ensureTrackWater('u1')).toBe(true)
    expect(localStorage.getItem('track_water_off:u1')).toBeNull()
  })

  it('кэш устройства виден СРАЗУ (до ответа профиля): стакан не мигает', () => {
    localStorage.setItem('track_water_off:u1', '1')
    void ensureTrackWater('u1')
    expect(trackWater.value).toBe(false) // синхронно, без await
  })

  it('кэш у каждого пользователя свой', () => {
    localStorage.setItem('track_water_off:u1', '1')
    expect(cachedTrackWater('u1')).toBe(false)
    expect(cachedTrackWater('u2')).toBe(true)
  })

  it('колонки нет (миграция 055 не применена) / сеть упала — остаётся кэш, по умолчанию «включено», ошибка наружу не летит', async () => {
    db.selectError = { message: 'column profiles.track_water does not exist' }
    expect(await ensureTrackWater('u1')).toBe(true)
    _resetTrackWaterForTests()
    localStorage.setItem('track_water_off:u1', '1')
    db.throwOnSelect = true
    expect(await ensureTrackWater('u1')).toBe(false) // кэш этого устройства
  })

  it('профиль без значения (null) не перетирает кэш', async () => {
    localStorage.setItem('track_water_off:u1', '1')
    db.row = { track_water: null }
    expect(await ensureTrackWater('u1')).toBe(false)
  })

  it('запрос в профиль один на страницу, повторные вызовы читают состояние без сети', async () => {
    db.row = { track_water: false }
    await Promise.all([ensureTrackWater('u1'), ensureTrackWater('u1')])
    await ensureTrackWater('u1')
    expect(db.selects).toBe(1)
  })
})

describe('учёт воды: запись выбора', () => {
  it('успех: upsert только user_id + track_water, кэш, состояние, событие для второго бандла и «данные изменились»', async () => {
    const seen: string[] = []
    const onTracking = (e: Event) => seen.push('tracking:' + (e as CustomEvent).detail.on)
    const onData = (e: Event) => seen.push('data:' + (e as CustomEvent).detail.source)
    window.addEventListener(WATER_TRACKING_EVENT, onTracking)
    window.addEventListener(DATA_CHANGED, onData)
    expect(await saveTrackWater('u1', false)).toEqual({ ok: true })
    window.removeEventListener(WATER_TRACKING_EVENT, onTracking)
    window.removeEventListener(DATA_CHANGED, onData)
    expect(db.upserts).toEqual([{ user_id: 'u1', track_water: false }])
    expect(trackWater.value).toBe(false)
    expect(cachedTrackWater('u1')).toBe(false)
    expect(seen).toEqual(['tracking:false', 'data:water-tracking']) // сначала состояние, потом пересчёт колец
  })

  it('включение обратно снимает кэш', async () => {
    await saveTrackWater('u1', false)
    expect(await saveTrackWater('u1', true)).toEqual({ ok: true })
    expect(trackWater.value).toBe(true)
    expect(localStorage.getItem('track_water_off:u1')).toBeNull()
  })

  it('ошибка записи: состояние, кэш и события не меняются, ошибка возвращается', async () => {
    db.upsertError = { message: 'column "track_water" of relation "profiles" does not exist' }
    let events = 0
    const on = () => events++
    window.addEventListener(WATER_TRACKING_EVENT, on)
    window.addEventListener(DATA_CHANGED, on)
    const res = await saveTrackWater('u1', false)
    window.removeEventListener(WATER_TRACKING_EVENT, on)
    window.removeEventListener(DATA_CHANGED, on)
    expect(res).toMatchObject({ ok: false })
    expect(trackWater.value).toBe(true)
    expect(cachedTrackWater('u1')).toBe(true)
    expect(events).toBe(0)
  })

  it('после записи повторный ensure не ходит в сеть и отдаёт новое значение', async () => {
    await saveTrackWater('u1', false)
    expect(await ensureTrackWater('u1')).toBe(false)
    expect(db.selects).toBe(0)
  })

  it('событие от второго бандла страницы меняет состояние без запроса', () => {
    window.dispatchEvent(new CustomEvent(WATER_TRACKING_EVENT, { detail: { on: false } }))
    expect(trackWater.value).toBe(false)
    window.dispatchEvent(new CustomEvent(WATER_TRACKING_EVENT, { detail: { on: true } }))
    expect(trackWater.value).toBe(true)
    window.dispatchEvent(new CustomEvent(WATER_TRACKING_EVENT, { detail: {} })) // мусор игнорируется
    expect(trackWater.value).toBe(true)
  })
})

describe('dropWaterIfOff', () => {
  it('включено — список без изменений (тот же массив)', () => {
    const list = [water, habit]
    expect(dropWaterIfOff(list, true)).toBe(list)
  })
  it('выключено — «главная» вода убирается, остальное остаётся в том же порядке', () => {
    expect(dropWaterIfOff([habit, water], false).map((m) => m.id)).toEqual(['h'])
  })
  it('убирается только главная вода: вторая «водная» метрика пользователя остаётся', () => {
    expect(dropWaterIfOff([water, water2, habit], false).map((m) => m.id)).toEqual(['w2', 'h'])
  })
  it('нет воды — ничего не меняется, исходный массив не мутируется', () => {
    const list = [habit]
    expect(dropWaterIfOff(list, false)).toBe(list)
    const withWater = [water, habit]
    dropWaterIfOff(withWater, false)
    expect(withWater).toHaveLength(2)
  })
})
