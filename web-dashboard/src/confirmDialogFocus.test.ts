import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import ConfirmDialogHost from './components/ConfirmDialogHost.vue'
import { confirmDialog } from './lib/confirmDialog'

// BACKLOG 72.5 срез 5: после закрытия окна подтверждения фокус возвращается на кнопку, из которой оно открыто (раньше терялся).
// Одинаковая копия в пилотах рядом с копиями confirmDialog.ts / ConfirmDialogHost.vue — менять вместе.
afterEach(() => { document.body.innerHTML = '' })

describe('ConfirmDialogHost: возврат фокуса', () => {
  it('Esc: фокус уходит на «Отмену», а после закрытия возвращается на кнопку-открывашку', async () => {
    const trigger = document.createElement('button')
    document.body.appendChild(trigger)
    trigger.focus()
    const w = mount(ConfirmDialogHost, { attachTo: document.body })
    const p = confirmDialog('Удалить?')
    await flushPromises(); await nextTick()
    expect(document.activeElement).not.toBe(trigger)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(await p).toBe(false)
    await flushPromises(); await nextTick()
    expect(document.activeElement).toBe(trigger)
    w.unmount()
  })

  it('кнопка «Отмена» тоже возвращает фокус', async () => {
    const trigger = document.createElement('button')
    document.body.appendChild(trigger)
    trigger.focus()
    const w = mount(ConfirmDialogHost, { attachTo: document.body })
    const p = confirmDialog('Удалить?')
    await flushPromises(); await nextTick()
    ;(document.activeElement as HTMLElement).click() // фокус сразу на «Отмене»
    expect(await p).toBe(false)
    await flushPromises(); await nextTick()
    expect(document.activeElement).toBe(trigger)
    w.unmount()
  })

  it('кнопка-открывашка пропала со страницы — ошибки нет', async () => {
    const errors: unknown[] = []
    const onError = (e: ErrorEvent) => errors.push(e.error)
    window.addEventListener('error', onError)
    const trigger = document.createElement('button')
    document.body.appendChild(trigger)
    trigger.focus()
    const w = mount(ConfirmDialogHost, { attachTo: document.body })
    const p = confirmDialog('Удалить?')
    await flushPromises(); await nextTick()
    trigger.remove()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(await p).toBe(false)
    await flushPromises(); await nextTick()
    expect(document.activeElement).toBe(document.body) // вернуть фокус некуда — он просто остаётся на странице
    expect(errors).toEqual([]) // и никаких ошибок
    w.unmount()
    window.removeEventListener('error', onError)
  })
})
