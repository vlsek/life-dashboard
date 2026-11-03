import { describe, expect, it } from 'vitest'
import { BEEP_TIMES, playRestBeep, readRestSound, writeRestSound, type AudioLike } from './restSound'

const fakeCtx = () => {
  const started: number[] = []
  const ctx: AudioLike = {
    currentTime: 10, destination: {},
    createOscillator: () => ({ type: '', frequency: { value: 0 }, connect() {}, start: (t?: number) => { started.push(t ?? -1) }, stop() {} }),
    createGain: () => ({ gain: { value: 0 }, connect() {} }),
  }
  return { ctx, started }
}
describe('звук отдыха', () => {
  it('три пика со смещением от текущего времени', () => {
    const { ctx, started } = fakeCtx()
    expect(playRestBeep(ctx)).toBe(3)
    expect(started).toEqual(BEEP_TIMES.map((d) => 10 + d))
  })
  it('нет аудио или ошибка — 0, без исключения', () => {
    expect(playRestBeep(null)).toBe(0)
    const bad = { ...fakeCtx().ctx, createOscillator: () => { throw new Error('x') } } as AudioLike
    expect(playRestBeep(bad)).toBe(0)
  })
  it('настройка: по умолчанию выкл, хранится', () => {
    const m = new Map<string, string>(); const s = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }
    expect(readRestSound(s)).toBe(false)
    writeRestSound(true, s); expect(readRestSound(s)).toBe(true)
    writeRestSound(false, s); expect(readRestSound(s)).toBe(false)
  })
})
