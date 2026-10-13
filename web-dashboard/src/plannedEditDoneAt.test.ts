import { describe, expect, it } from 'vitest'
import { editCustom, nowHHMM, setCustomDone, setDoneAt, type PlannedEntry } from './lib/planned'

// BACKLOG 61.3 (правка пункта плана) и 61.4 (время выполнения ставится само при галке).
describe('время выполнения (61.4)', () => {
  const base: PlannedEntry[] = [{ type: 'custom', text: 'Йога', done: false }, { type: 'goal', text: 'Цель' }]
  it('галка на сегодняшнем дне пишет doneAt, снятие убирает', () => {
    const on = setCustomDone(base, 0, true, '14:32')
    expect(on[0]).toMatchObject({ done: true, doneAt: '14:32' })
    const off = setCustomDone(on, 0, false, '15:00')
    expect(off[0].done).toBe(false)
    expect('doneAt' in off[0]).toBe(false)
  })
  it('без nowTime (прошлый день) время не выдумывается, а прежнее остаётся', () => {
    expect('doneAt' in setCustomDone(base, 0, true)[0]).toBe(false)
    expect(setCustomDone([{ type: 'custom', text: 'x', done: true, doneAt: '09:10' }], 0, true)[0].doneAt).toBe('09:10')
    expect('doneAt' in setCustomDone(base, 0, true, 'мусор')[0]).toBe(false)
  })
  it('setDoneAt для пункта-цели и ручная правка; пусто убирает', () => {
    expect(setDoneAt(base, 1, '18:05')[1].doneAt).toBe('18:05')
    expect('doneAt' in setDoneAt(setDoneAt(base, 1, '18:05'), 1, null)[1]).toBe(false)
    expect(base[1]).toEqual({ type: 'goal', text: 'Цель' }) // исходный массив не тронут
  })
  it('nowHHMM — двузначные часы и минуты', () => {
    expect(nowHHMM(new Date(2026, 9, 12, 7, 5))).toBe('07:05')
  })
})

describe('правка своего пункта (61.3)', () => {
  const list: PlannedEntry[] = [{ type: 'custom', text: 'Йога', done: true, doneAt: '10:00', time: '09:00', bonus: true }, { type: 'goal', text: 'Цель' }]
  it('меняет название и время, сохраняет остальные поля', () => {
    const r = editCustom(list, 0, { text: '  Растяжка  ', time: '08:30', doneAt: '10:15' })
    expect(r[0]).toMatchObject({ type: 'custom', text: 'Растяжка', done: true, bonus: true, time: '08:30', doneAt: '10:15' })
  })
  it('пустое время напоминания убирает поле; пустое название и пункт-цель — отклоняются', () => {
    expect('time' in editCustom(list, 0, { text: 'Йога', time: null })[0]).toBe(false)
    expect(editCustom(list, 0, { text: '   ' })).toBe(list)
    expect(editCustom(list, 1, { text: 'Другое имя' })).toBe(list)
  })
  it('doneAt у невыполненного пункта не сохраняется', () => {
    const r = editCustom([{ type: 'custom', text: 'a', done: false }], 0, { text: 'a', doneAt: '10:00' })
    expect('doneAt' in r[0]).toBe(false)
  })
})
