import { describe, expect, it } from 'vitest'
import { addExercise, newDraft, toggleSupersetWithNext } from './activeWorkout'
import { adjustRest, isRestDone, nextPreset, readRestSeconds, REST_MAX, REST_STORE_KEY, restLeft, restProgress, shouldRestAfter, startRest, writeRestSeconds } from './restTimer'

describe('таймер отдыха', () => {
  it('старт: метка окончания; 0 секунд = выключено', () => {
    expect(startRest(1000, 0)).toBeNull(); const r = startRest(1000, 90)!
    expect(r.endsAt).toBe(91000); expect(restLeft(r, 1000)).toBe(90); expect(restLeft(r, 31000)).toBe(60); expect(isRestDone(r, 91000)).toBe(true); expect(restLeft(r, 99999)).toBe(0)
  })
  it('точность в фоне: остаток считается по часам, а не по числу тиков', () => {
    const r = startRest(0, 60)!; expect(restLeft(r, 45000)).toBe(15) // «вкладка спала» 45 секунд — остаток верный
  })
  it('±15: не ниже нуля и не выше потолка; прогресс 0..1', () => {
    const r = startRest(0, 90)!
    expect(restLeft(adjustRest(r, 0, 15), 0)).toBe(105); expect(restLeft(adjustRest(r, 80000, -15), 80000)).toBe(0); expect(restLeft(adjustRest(r, 0, 9999), 0)).toBe(REST_MAX)
    expect(restProgress(r, 45000)).toBeCloseTo(0.5); expect(restProgress(adjustRest(r, 0, 30), 0)).toBe(1)
  })
  it('в суперсете отдых только после последнего упражнения группы', () => {
    const d = toggleSupersetWithNext(['a', 'b', 'c'].reduce((x, id) => addExercise(x, id, 'x' + id), newDraft('s', new Date())), 'a') // a+b — суперсет, c — одиночное
    expect([0, 1, 2].map((i) => shouldRestAfter(d, i))).toEqual([false, true, true])
  })
  it('настройка: по кругу выкл→60→90→120→180→выкл; хранение, мусор → 90', () => {
    expect([0, 60, 90, 120, 180].map(nextPreset)).toEqual([60, 90, 120, 180, 0])
    const m = new Map<string, string>(); const s = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v) } }
    expect(readRestSeconds(s)).toBe(90); writeRestSeconds(0, s); expect(readRestSeconds(s)).toBe(0); m.set(REST_STORE_KEY, '77'); expect(readRestSeconds(s)).toBe(90)
  })
})
