import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref, withDirectives } from 'vue'
import { mount } from '@vue/test-utils'
import { vCollapse } from './collapseMotion'

// В тестовой среде высоту измерить нельзя (scrollHeight = 0), поэтому директива работает как v-show —
// это и проверяем: состояние в DOM предсказуемо, без ожидания анимации. Сама анимация — визуальная.
function host(initial: boolean) {
  const open = ref(initial)
  const C = defineComponent({ setup: () => () => withDirectives(h('div', { 'data-test': 'body' }, 'тело'), [[vCollapse, open.value]]) })
  const w = mount(C)
  return { w, open, el: () => w.find('[data-test="body"]').element as HTMLElement }
}

afterEach(() => vi.useRealTimers())

describe('vCollapse', () => {
  it('изначально открыто — виден; изначально закрыто — display:none без анимации', () => {
    expect(host(true).el().style.display).not.toBe('none')
    expect(host(false).el().style.display).toBe('none')
  })

  it('переключение скрывает и показывает тело, оставляя его в DOM', async () => {
    const { open, el, w } = host(true)
    open.value = false
    await nextTick()
    expect(el().style.display).toBe('none')
    expect(w.text()).toContain('тело')
    open.value = true
    await nextTick()
    expect(el().style.display).not.toBe('none')
    w.unmount()
  })

  it('с измеримой высотой при сворачивании ждёт конца анимации, затем display:none и чистые inline-стили', async () => {
    vi.useFakeTimers()
    const { open, el, w } = host(true)
    Object.defineProperty(el(), 'scrollHeight', { value: 120, configurable: true })
    open.value = false
    await nextTick()
    expect(el().style.display).not.toBe('none') // ещё анимируется
    expect(el().style.overflow).toBe('hidden')
    vi.advanceTimersByTime(300)
    expect(el().style.display).toBe('none')
    expect(el().style.height).toBe('')
    expect(el().style.overflow).toBe('')
    w.unmount()
  })

  it('быстрый двойной клик не оставляет тело в промежуточном состоянии', async () => {
    vi.useFakeTimers()
    const { open, el, w } = host(true)
    Object.defineProperty(el(), 'scrollHeight', { value: 120, configurable: true })
    open.value = false
    await nextTick()
    open.value = true
    await nextTick()
    vi.advanceTimersByTime(400)
    expect(el().style.display).not.toBe('none')
    expect(el().style.height).toBe('')
    expect(el().style.opacity).toBe('')
    w.unmount()
  })
})
