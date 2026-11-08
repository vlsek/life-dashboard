import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import ItemForm from './components/ItemForm.vue'
import ShopIdea from './components/ShopIdea.vue'
import ConfirmDialogHost from './components/ConfirmDialogHost.vue'
import { confirmDialog } from './lib/confirmDialog'
import { sparksMode } from './lib/sparks'

// BACKLOG 72.5 срез 4: окна магазина — роль, название, подписи полей, фокус и Esc (в браузере то же проверяет scripts/shop_keyboard_check.py).
const form = (over: Record<string, unknown> = {}) => mount(ItemForm, { props: { existing: null, uploadImage: async () => null, ...over }, attachTo: document.body })

beforeEach(() => { localStorage.clear(); localStorage.setItem('site_lang', 'ru'); sparksMode.value = false })
afterEach(() => { document.body.innerHTML = '' })

describe('ItemForm: доступность окна', () => {
  it('у окна роль диалога, aria-modal и название из заголовка', () => {
    const w = form()
    const dlg = w.get('[role="dialog"]')
    expect(dlg.attributes('aria-modal')).toBe('true')
    const id = dlg.attributes('aria-labelledby')!
    expect(w.get('#' + id).text()).toBeTruthy()
    w.unmount()
  })
  it('у каждого поля есть связанная подпись (label for ↔ id)', () => {
    const w = form()
    const fields = w.findAll('input[type="text"], input[type="number"]')
    expect(fields.length).toBeGreaterThanOrEqual(4)
    for (const f of fields) {
      const id = f.attributes('id')
      expect(id, 'у поля есть id').toBeTruthy()
      expect(w.find(`label[for="${id}"]`).exists(), `подпись для #${id}`).toBe(true)
    }
    expect(w.get('input[type="file"]').attributes('aria-label')).toBeTruthy()
    w.unmount()
  })
  it('в режиме огоньков поле калькулятора тоже подписано', () => {
    sparksMode.value = true
    const w = form()
    const rub = w.get('[data-testid="rub-input"]')
    expect(w.find(`label[for="${rub.attributes('id')}"]`).exists()).toBe(true)
    w.unmount()
  })
  it('фокус после открытия на первом поле (название)', () => {
    const w = form()
    expect(document.activeElement).toBe(w.get('#item-form-name').element)
    w.unmount()
  })
  it('Esc закрывает окно так же, как «Отмена»', () => {
    const w = form()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(w.emitted('close')).toHaveLength(1)
    w.unmount()
  })
  it('Tab с последней кнопки возвращается на первое поле (фокус не уходит на страницу)', () => {
    const w = form()
    const buttons = w.findAll('.modal-actions button')
    ;(buttons[buttons.length - 1].element as HTMLElement).focus()
    const e = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
    document.dispatchEvent(e)
    expect(e.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(w.get('#item-form-name').element)
    w.unmount()
  })
  it('при закрытии фокус возвращается на кнопку, открывшую окно', () => {
    const opener = document.createElement('button')
    document.body.appendChild(opener)
    opener.focus()
    const w = form()
    w.unmount()
    expect(document.activeElement).toBe(opener)
  })
})

describe('ShopIdea: фокус в окне подсказки', () => {
  it('открытие переносит фокус внутрь окна, закрытие возвращает на «ⓘ»', async () => {
    localStorage.setItem('shop_idea_seen', '1')
    const w = mount(ShopIdea, { attachTo: document.body })
    const btn = w.get('[data-testid="idea-info"]')
    ;(btn.element as HTMLElement).focus()
    await btn.trigger('click')
    await nextTick(); await nextTick()
    const modal = w.get('[data-testid="idea-modal"]').element
    expect(modal.contains(document.activeElement)).toBe(true)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick(); await nextTick()
    expect(w.find('[data-testid="idea-modal"]').exists()).toBe(false)
    expect(document.activeElement).toBe(btn.element)
    w.unmount()
  })
})

describe('ConfirmDialogHost: возврат фокуса', () => {
  it('после закрытия подтверждения фокус возвращается на кнопку, из которой его открыли', async () => {
    const trigger = document.createElement('button')
    trigger.textContent = 'удалить'
    document.body.appendChild(trigger)
    trigger.focus()
    const w = mount(ConfirmDialogHost, { attachTo: document.body })
    const p = confirmDialog('Удалить?')
    await flushPromises(); await nextTick()
    expect(document.activeElement).not.toBe(trigger) // фокус ушёл на «Отмену»
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(await p).toBe(false)
    await flushPromises(); await nextTick()
    expect(document.activeElement).toBe(trigger)
    w.unmount()
  })
})
