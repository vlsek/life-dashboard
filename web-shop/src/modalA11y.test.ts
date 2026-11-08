import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { useModalA11y } from './lib/modalA11y'

// BACKLOG 72.5 срез 4: клавиатура и фокус в окнах. Браузерная проверка — scripts/shop_keyboard_check.py; здесь — логика помощника.
const onClose = vi.fn()
const Modal = defineComponent({
  props: { empty: Boolean },
  setup(props) {
    const root = ref<HTMLElement | null>(null)
    useModalA11y(root, { onClose })
    return () => h('div', { ref: root, 'data-testid': 'dlg' }, props.empty ? [h('span', 'нет кнопок')] : [h('button', { 'data-testid': 'b1' }, '1'), h('input', { 'data-testid': 'i2' }), h('button', { 'data-testid': 'b3' }, '3')])
  },
})
const Later = defineComponent({
  setup(_p, { expose }) {
    const open = ref(false)
    const root = ref<HTMLElement | null>(null)
    useModalA11y(root)
    expose({ open })
    return () => h('div', open.value ? [h('div', { ref: root, 'data-testid': 'later' }, [h('button', { 'data-testid': 'lb' }, 'x')])] : [])
  },
})
const tab = (shift = false) => { const e = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: shift, bubbles: true, cancelable: true }); document.dispatchEvent(e); return e }
let opener: HTMLButtonElement
function withOpener() {
  opener = document.createElement('button')
  opener.textContent = 'открыть'
  document.body.appendChild(opener)
  opener.focus()
}
afterEach(() => { document.body.innerHTML = ''; onClose.mockReset() })

describe('useModalA11y', () => {
  it('при открытии фокус заходит на первый элемент внутри окна', () => {
    withOpener()
    const w = mount(Modal, { attachTo: document.body })
    expect(document.activeElement).toBe(w.get('[data-testid="b1"]').element)
    w.unmount()
  })
  it('Tab на последнем элементе переходит на первый, Shift+Tab на первом — на последний (ловушка фокуса)', () => {
    withOpener()
    const w = mount(Modal, { attachTo: document.body })
    ;(w.get('[data-testid="b3"]').element as HTMLElement).focus()
    const e1 = tab()
    expect(e1.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(w.get('[data-testid="b1"]').element)
    const e2 = tab(true)
    expect(e2.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(w.get('[data-testid="b3"]').element)
    w.unmount()
  })
  it('Tab в середине окна браузер ведёт сам (событие не перехватывается)', () => {
    withOpener()
    const w = mount(Modal, { attachTo: document.body })
    ;(w.get('[data-testid="i2"]').element as HTMLElement).focus()
    expect(tab().defaultPrevented).toBe(false)
    expect(tab(true).defaultPrevented).toBe(false)
    w.unmount()
  })
  it('если фокус оказался за окном, Tab возвращает его внутрь', () => {
    withOpener()
    const w = mount(Modal, { attachTo: document.body })
    opener.focus()
    expect(tab().defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(w.get('[data-testid="b1"]').element)
    w.unmount()
  })
  it('Esc вызывает onClose, но не когда поверх открыто подтверждение', () => {
    withOpener()
    const w = mount(Modal, { attachTo: document.body })
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(onClose).toHaveBeenCalledTimes(1)
    const confirm = document.createElement('div')
    confirm.setAttribute('data-test', 'confirm-dialog')
    document.body.appendChild(confirm)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(onClose).toHaveBeenCalledTimes(1)
    w.unmount()
  })
  it('при закрытии фокус возвращается на кнопку, открывшую окно; пропавшую кнопку не трогает', () => {
    withOpener()
    const w = mount(Modal, { attachTo: document.body })
    w.unmount()
    expect(document.activeElement).toBe(opener)
    withOpener()
    const w2 = mount(Modal, { attachTo: document.body })
    opener.remove()
    expect(() => w2.unmount()).not.toThrow()
  })
  it('окно без фокусируемых элементов принимает фокус само, Tab его не теряет', () => {
    withOpener()
    const w = mount(Modal, { props: { empty: true }, attachTo: document.body })
    const dlg = w.get('[data-testid="dlg"]').element
    expect(document.activeElement).toBe(dlg)
    expect(tab().defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(dlg)
    w.unmount()
  })
  it('окно, появляющееся позже внутри компонента (v-if): активируется при показе, фокус возвращается при скрытии', async () => {
    withOpener()
    const w = mount(Later, { attachTo: document.body })
    expect(document.activeElement).toBe(opener) // пока окна нет — фокус не трогаем
    ;(w.vm as unknown as { open: boolean }).open = true
    await nextTick(); await nextTick()
    expect(document.activeElement).toBe(w.get('[data-testid="lb"]').element)
    ;(w.vm as unknown as { open: boolean }).open = false
    await nextTick(); await nextTick()
    expect(document.activeElement).toBe(opener)
    w.unmount()
  })
  it('после закрытия обработчик клавиш снят: Tab и Esc больше ничего не делают', () => {
    withOpener()
    const w = mount(Modal, { attachTo: document.body })
    w.unmount()
    expect(tab().defaultPrevented).toBe(false)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(onClose).not.toHaveBeenCalled()
  })
})
