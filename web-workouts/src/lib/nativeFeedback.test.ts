import { afterEach, describe, expect, it, vi } from 'vitest'
import { haptic } from './nativeFeedback'

const g = globalThis as { __ldNative?: unknown }
afterEach(() => { delete g.__ldNative })

describe('haptic: вибро-отклик в приложении, тишина в браузере', () => {
  it('в браузере (нет __ldNative) ничего не делает и не бросает', () => {
    expect(() => haptic('light')).not.toThrow()
  })
  it('в приложении зовёт haptic с нужным видом, по умолчанию — лёгкий', () => {
    const spy = vi.fn(() => Promise.resolve(true))
    g.__ldNative = { haptic: spy }
    haptic()
    haptic('success')
    expect(spy.mock.calls).toEqual([['light'], ['success']])
  })
  it('ошибка плагина (синхронная или в промисе) не ломает сценарий', async () => {
    g.__ldNative = { haptic: () => { throw new Error('x') } }
    expect(() => haptic()).not.toThrow()
    g.__ldNative = { haptic: () => Promise.reject(new Error('y')) }
    expect(() => haptic()).not.toThrow()
    await Promise.resolve()
  })
})
