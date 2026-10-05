import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ConfirmDialogHost from './components/ConfirmDialogHost.vue'
import { confirmDialog, confirmState, settleConfirm } from './lib/confirmDialog'

// Замена нативных confirm()/alert() (BACKLOG 567): promise разрешается true по главной кнопке и false по «Отмене», Esc и фону.
beforeEach(() => localStorage.setItem('site_lang', 'ru'))
afterEach(() => {
  settleConfirm(false)
  localStorage.removeItem('site_lang')
  document.body.innerHTML = ''
})

describe('confirmDialog', () => {
  it('без запроса окна нет; запрос показывает сообщение, «Отмену» и «Удалить» по умолчанию', async () => {
    const w = mount(ConfirmDialogHost, { attachTo: document.body })
    expect(w.find('[data-test="confirm-dialog"]').exists()).toBe(false)
    void confirmDialog('Удалить эту цель?')
    await w.vm.$nextTick()
    expect(w.find('[role="alertdialog"]').attributes('aria-modal')).toBe('true')
    expect(w.find('[data-test="confirm-dialog-text"]').text()).toBe('Удалить эту цель?')
    expect(w.find('[data-test="confirm-dialog-cancel"]').text()).toBe('Отмена')
    expect(w.find('[data-test="confirm-dialog-ok"]').text()).toBe('Удалить')
    w.unmount()
  })

  it('главная кнопка → true, окно закрывается', async () => {
    const w = mount(ConfirmDialogHost, { attachTo: document.body })
    const p = confirmDialog('?')
    await w.vm.$nextTick()
    await w.find('[data-test="confirm-dialog-ok"]').trigger('click')
    expect(await p).toBe(true)
    expect(w.find('[data-test="confirm-dialog"]').exists()).toBe(false)
    w.unmount()
  })

  it('«Отмена», клик по фону и Esc → false; клик внутри окна не закрывает', async () => {
    const w = mount(ConfirmDialogHost, { attachTo: document.body })
    let p = confirmDialog('?')
    await w.vm.$nextTick()
    await w.find('[data-test="confirm-dialog"]').trigger('click')
    expect(confirmState.current).not.toBeNull()
    await w.find('[data-test="confirm-dialog-cancel"]').trigger('click')
    expect(await p).toBe(false)

    p = confirmDialog('?')
    await w.vm.$nextTick()
    await w.find('[data-test="confirm-dialog-backdrop"]').trigger('click')
    expect(await p).toBe(false)

    p = confirmDialog('?')
    await w.vm.$nextTick()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(await p).toBe(false)
    w.unmount()
  })

  it('фокус сразу на «Отмене», а не на опасной кнопке', async () => {
    const w = mount(ConfirmDialogHost, { attachTo: document.body })
    void confirmDialog('?')
    await w.vm.$nextTick()
    await w.vm.$nextTick()
    expect(document.activeElement).toBe(w.find('[data-test="confirm-dialog-cancel"]').element)
    w.unmount()
  })

  it('своя подпись главной кнопки; infoOnly — одна кнопка «OK» (замена alert), она же возвращает true', async () => {
    const w = mount(ConfirmDialogHost, { attachTo: document.body })
    const p1 = confirmDialog('Бросить?', { okLabel: 'Бросить' })
    await w.vm.$nextTick()
    expect(w.find('[data-test="confirm-dialog-ok"]').text()).toBe('Бросить')
    settleConfirm(false)
    await p1

    const p2 = confirmDialog('Не удалось сохранить', { infoOnly: true })
    await w.vm.$nextTick()
    await w.vm.$nextTick()
    expect(w.find('[data-test="confirm-dialog-cancel"]').exists()).toBe(false)
    expect(w.find('[data-test="confirm-dialog-ok"]').text()).toBe('OK')
    expect(document.activeElement).toBe(w.find('[data-test="confirm-dialog-ok"]').element)
    await w.find('[data-test="confirm-dialog-ok"]').trigger('click')
    expect(await p2).toBe(true)
    w.unmount()
  })

  it('новый запрос поверх висящего отменяет прежний (false) и показывает свой текст', async () => {
    const w = mount(ConfirmDialogHost, { attachTo: document.body })
    const first = confirmDialog('первый')
    await w.vm.$nextTick()
    const second = confirmDialog('второй')
    expect(await first).toBe(false)
    await w.vm.$nextTick()
    expect(w.find('[data-test="confirm-dialog-text"]').text()).toBe('второй')
    await w.find('[data-test="confirm-dialog-ok"]').trigger('click')
    expect(await second).toBe(true)
    w.unmount()
  })

  it('английские подписи', async () => {
    localStorage.setItem('site_lang', 'en')
    const w = mount(ConfirmDialogHost, { attachTo: document.body })
    void confirmDialog('Delete this item?')
    await w.vm.$nextTick()
    expect(w.find('[data-test="confirm-dialog-cancel"]').text()).toBe('Cancel')
    expect(w.find('[data-test="confirm-dialog-ok"]').text()).toBe('Delete')
    w.unmount()
  })
})
