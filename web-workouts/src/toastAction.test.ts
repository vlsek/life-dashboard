import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import Toast from './components/Toast.vue'
import { showToast, toast } from './lib/toast'

// Кнопка «Отменить» в тосте (69.11 срез 9): видна только у тоста с действием, тап вызывает действие и прячет тост
describe('Toast.vue: кнопка действия', () => {
  afterEach(() => { toast.value = null })
  it('обычный тост без кнопки', async () => {
    const w = mount(Toast, { global: { stubs: { Transition: false } } })
    showToast('ok')
    await w.vm.$nextTick()
    expect(w.text()).toContain('ok')
    expect(w.find('[data-testid="toast-action"]').exists()).toBe(false)
  })
  it('тост с действием: кнопка вызывает действие один раз и убирает тост', async () => {
    const run = vi.fn()
    const w = mount(Toast, { global: { stubs: { Transition: false } } })
    showToast('Удалено записей: 2', 'success', { action: { label: 'Отменить', run } })
    await w.vm.$nextTick()
    const b = w.get('[data-testid="toast-action"]')
    expect(b.text()).toBe('Отменить')
    await b.trigger('click')
    expect(run).toHaveBeenCalledTimes(1)
    expect(toast.value).toBeNull()
  })
})
