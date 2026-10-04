import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ShopIdea from './ShopIdea.vue'
import { SHOP_IDEA_SEEN_KEY } from '../lib/shopIdea'

beforeEach(() => localStorage.setItem('site_lang', 'ru'))
afterEach(() => {
  localStorage.removeItem('site_lang')
  localStorage.removeItem(SHOP_IDEA_SEEN_KEY)
  document.body.innerHTML = ''
})

describe('ShopIdea: описание идеи магазина', () => {
  it('первый заход: плашка с названием и полным текстом, короткой строки и значка ⓘ пока нет', () => {
    const w = mount(ShopIdea, { attachTo: document.body })
    expect(w.find('[data-testid="idea-banner-title"]').text()).toBe('Магазин заслуженного')
    const text = w.find('[data-testid="idea-banner-text"]').text()
    expect(text).toContain('без чувства вины')
    expect(text).toContain('ты это заслужил')
    expect(w.find('[data-testid="idea-short-line"]').exists()).toBe(false)
    expect(w.find('[data-testid="idea-info"]').exists()).toBe(false)
    w.unmount()
  })

  it('«Понятно»: плашка исчезает, появляется короткая строка со значком ⓘ, флаг запомнен на устройстве', async () => {
    const w = mount(ShopIdea, { attachTo: document.body })
    await w.find('[data-testid="idea-dismiss"]').trigger('click')
    expect(w.find('[data-testid="idea-banner"]').exists()).toBe(false)
    expect(w.find('[data-testid="idea-short"]').text()).toBe('Здесь не тратят деньги — здесь тратят сделанное. Каждый балл — это день, в котором ты постарался.')
    expect(w.find('[data-testid="idea-info"]').attributes('aria-label')).toBe('Как устроен магазин')
    expect(localStorage.getItem(SHOP_IDEA_SEEN_KEY)).toBe('1')
    w.unmount()
  })

  it('повторный заход: плашки нет, сразу короткая строка', () => {
    localStorage.setItem(SHOP_IDEA_SEEN_KEY, '1')
    const w = mount(ShopIdea, { attachTo: document.body })
    expect(w.find('[data-testid="idea-banner"]').exists()).toBe(false)
    expect(w.find('[data-testid="idea-short-line"]').exists()).toBe(true)
    w.unmount()
  })

  it('ⓘ открывает окно с тем же полным текстом; закрывается кнопкой, фоном и Esc, но не кликом внутри', async () => {
    localStorage.setItem(SHOP_IDEA_SEEN_KEY, '1')
    const w = mount(ShopIdea, { attachTo: document.body })
    expect(w.find('[data-testid="idea-modal"]').exists()).toBe(false)

    await w.find('[data-testid="idea-info"]').trigger('click')
    expect(w.find('[role="dialog"]').attributes('aria-modal')).toBe('true')
    expect(w.find('[data-testid="idea-modal-title"]').text()).toBe('Магазин заслуженного')
    expect(w.find('[data-testid="idea-modal-text"]').text()).toContain('Накопил — купил.')

    await w.find('[data-testid="idea-modal"]').trigger('click')
    expect(w.find('[data-testid="idea-modal"]').exists()).toBe(true)

    await w.find('[data-testid="idea-close"]').trigger('click')
    expect(w.find('[data-testid="idea-modal"]').exists()).toBe(false)

    await w.find('[data-testid="idea-info"]').trigger('click')
    await w.find('[data-testid="idea-backdrop"]').trigger('click')
    expect(w.find('[data-testid="idea-modal"]').exists()).toBe(false)

    await w.find('[data-testid="idea-info"]').trigger('click')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await w.vm.$nextTick()
    expect(w.find('[data-testid="idea-modal"]').exists()).toBe(false)
    w.unmount()
  })

  it('английская версия: название, короткая и полная строки на месте', async () => {
    localStorage.setItem('site_lang', 'en')
    const w = mount(ShopIdea, { attachTo: document.body })
    expect(w.find('[data-testid="idea-banner-title"]').text()).toBe('The Earned Shop')
    expect(w.find('[data-testid="idea-banner-text"]').text()).toContain('guilt-free')
    await w.find('[data-testid="idea-dismiss"]').trigger('click')
    expect(w.find('[data-testid="idea-short"]').text()).toBe("No money here — you spend what you've done. Every point is a day you showed up.")
    expect(w.find('[data-testid="idea-dismiss"]').exists()).toBe(false)
    w.unmount()
  })
})
