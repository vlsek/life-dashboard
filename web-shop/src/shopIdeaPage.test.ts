import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

// Описание идеи действительно стоит на странице «Магазин» (а не только как отдельный компонент) и не мешает остальному.
const h = vi.hoisted(() => ({ state: null as any }))
vi.mock('./lib/useShop', () => ({ useShop: () => h.state }))

import App from './App.vue'

function setup() {
  h.state = {
    auth: ref({ status: 'ready', userId: 'u', userEmail: 'a@b.c' }),
    items: ref([{ id: 'movie', user_id: 'u', name: 'movie', link: null, cost: 150, image_url: null, redeemed: false, redeemed_date: null }]),
    balance: ref({ total: 400, spent: 100, balance: 300 }),
    error: ref(null),
    init: vi.fn(),
    addItem: vi.fn(),
    updateItem: vi.fn(),
    buyItem: vi.fn(),
    deleteItem: vi.fn(),
    uploadImage: vi.fn(),
  }
  return mount(App, { attachTo: document.body })
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  document.body.innerHTML = ''
})

describe('Магазин: описание идеи на странице', () => {
  it('новый человек видит плашку «Магазин заслуженного», витрина с товаром при этом на месте', () => {
    const w = setup()
    expect(w.find('[data-testid="idea-banner"]').exists()).toBe(true)
    expect(w.find('[data-testid="grid-view"]').exists()).toBe(true)
    w.unmount()
  })

  it('после «Понятно» остаётся короткая строка со значком ⓘ, старого однострочного интро больше нет', async () => {
    const w = setup()
    await w.find('[data-testid="idea-dismiss"]').trigger('click')
    expect(w.find('[data-testid="idea-short"]').exists()).toBe(true)
    expect(w.text()).not.toContain('разрешаю себе купить')
    w.unmount()
  })
})
