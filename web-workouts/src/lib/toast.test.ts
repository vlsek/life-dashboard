import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { runToastAction, showToast, toast } from './toast'

describe('toast: необязательная кнопка действия', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => { vi.useRealTimers(); toast.value = null })

  it('обычный тост без кнопки исчезает за 2,2 с, как раньше', () => {
    showToast('ok')
    expect(toast.value?.action).toBeUndefined()
    vi.advanceTimersByTime(2199)
    expect(toast.value).not.toBeNull()
    vi.advanceTimersByTime(2)
    expect(toast.value).toBeNull()
  })
  it('тост с кнопкой висит дольше (7 с)', () => {
    showToast('удалено', 'success', { action: { label: 'Отменить', run: () => {} } })
    vi.advanceTimersByTime(6999)
    expect(toast.value).not.toBeNull()
    vi.advanceTimersByTime(2)
    expect(toast.value).toBeNull()
  })
  it('runToastAction вызывает действие один раз и прячет тост', () => {
    const run = vi.fn()
    showToast('удалено', 'success', { action: { label: 'Отменить', run } })
    runToastAction()
    runToastAction()
    expect(run).toHaveBeenCalledTimes(1)
    expect(toast.value).toBeNull()
  })
  it('новый тост заменяет прежний вместе с кнопкой', () => {
    showToast('a', 'success', { action: { label: 'x', run: () => {} } })
    showToast('b')
    expect(toast.value?.message).toBe('b')
    expect(toast.value?.action).toBeUndefined()
  })
})
