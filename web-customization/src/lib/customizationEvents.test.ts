import { describe, expect, it, vi } from 'vitest'
// @ts-ignore — типов node в проекте нет, vitest работает в node
import { readFileSync } from 'node:fs'
import { notifyCustomizationChanged, onCustomizationChanged, parseCustomizationDetail } from './customizationEvents'

// BACKLOG раздел 43, 9:41: надеть/снять рамку применяется без обновления страницы — общий канал событий.
describe('customizationEvents: копии в пилотах', () => {
  it('web-customization, web-header и web-dashboard держат ОДИНАКОВЫЙ файл (менять вместе)', () => {
    const base: string = readFileSync('src/lib/customizationEvents.ts', 'utf-8')
    expect(readFileSync('../web-header/src/lib/customizationEvents.ts', 'utf-8')).toBe(base)
    expect(readFileSync('../web-dashboard/src/lib/customizationEvents.ts', 'utf-8')).toBe(base)
  })
})

describe('parseCustomizationDetail', () => {
  it('принимает ключ рамки и null, остальное отбрасывает', () => {
    expect(parseCustomizationDetail({ avatar_frame: 'frame_gold' })).toEqual({ avatar_frame: 'frame_gold' })
    expect(parseCustomizationDetail({ avatar_frame: null })).toEqual({ avatar_frame: null })
    for (const bad of [null, undefined, 5, 'x', {}, { avatar_frame: 7 }, { avatar_frame: '' }, { avatar_frame: 'x'.repeat(65) }]) {
      expect(parseCustomizationDetail(bad)).toBeNull()
    }
  })
})

describe('notify / on', () => {
  it('подписчик в той же вкладке получает выбор; после отписки — нет', () => {
    const cb = vi.fn()
    const off = onCustomizationChanged(cb)
    notifyCustomizationChanged({ avatar_frame: 'frame_neon' })
    expect(cb).toHaveBeenCalledWith({ avatar_frame: 'frame_neon' })
    notifyCustomizationChanged({ avatar_frame: null })
    expect(cb).toHaveBeenLastCalledWith({ avatar_frame: null })
    off()
    cb.mockClear()
    notifyCustomizationChanged({ avatar_frame: 'frame_gold' })
    expect(cb).not.toHaveBeenCalled()
  })
  it('чужое/мусорное событие на window игнорируется', () => {
    const cb = vi.fn()
    const off = onCustomizationChanged(cb)
    window.dispatchEvent(new CustomEvent('customization:changed', { detail: { avatar_frame: 42 } }))
    expect(cb).not.toHaveBeenCalled()
    off()
  })
})
