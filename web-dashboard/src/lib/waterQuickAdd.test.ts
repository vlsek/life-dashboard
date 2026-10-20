import { describe, expect, it, vi } from 'vitest'
import { onWaterAddRequest, parseCustomMl, requestWaterAdd } from './waterQuickAdd'

describe('waterQuickAdd', () => {
  it('requestWaterAdd шлёт событие подписчику с округлённым объёмом', () => {
    const cb = vi.fn()
    const off = onWaterAddRequest(cb)
    expect(requestWaterAdd(200)).toBe(true)
    expect(requestWaterAdd(333.6)).toBe(true)
    expect(cb).toHaveBeenNthCalledWith(1, 200)
    expect(cb).toHaveBeenNthCalledWith(2, 334)
    off()
    requestWaterAdd(500)
    expect(cb).toHaveBeenCalledTimes(2)
  })
  it('неверные объёмы не отправляются', () => {
    const cb = vi.fn()
    const off = onWaterAddRequest(cb)
    for (const v of [0, -5, NaN, Infinity, 20001]) expect(requestWaterAdd(v)).toBe(false)
    expect(cb).not.toHaveBeenCalled()
    off()
  })
  it('поддельное событие с мусором игнорируется', () => {
    const cb = vi.fn()
    const off = onWaterAddRequest(cb)
    window.dispatchEvent(new CustomEvent('ld:water-quick-add', { detail: { ml: '200' } }))
    window.dispatchEvent(new CustomEvent('ld:water-quick-add'))
    expect(cb).not.toHaveBeenCalled()
    off()
  })
  it('parseCustomMl: целое от 1 до 20000, запятая допустима', () => {
    expect(parseCustomMl('250')).toBe(250)
    expect(parseCustomMl(' 250,7 ')).toBe(250)
    for (const bad of ['', '0', '-3', 'abc', '20001']) expect(parseCustomMl(bad)).toBeNull()
  })
})
