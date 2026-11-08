import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import ItemForm from './components/ItemForm.vue'

// BACKLOG 81.6: «Найти фото» в форме хотелки — превью из Openverse, тап ставит ссылку в поле «Картинка» и в сохранение.
const form = () => mount(ItemForm, { props: { existing: null, uploadImage: async () => null }, attachTo: document.body })
const mockFetch = (impl: () => Promise<unknown>) => vi.stubGlobal('fetch', vi.fn(impl))

beforeEach(() => localStorage.setItem('site_lang', 'ru'))
afterEach(() => vi.unstubAllGlobals())

describe('форма хотелки: найти фото', () => {
  it('кнопка выключена, пока название короче двух букв', async () => {
    const w = form()
    expect(w.get('[data-testid="find-photo"]').attributes('disabled')).toBeDefined()
    await w.get('input[type="text"]').setValue('Кофе')
    expect(w.get('[data-testid="find-photo"]').attributes('disabled')).toBeUndefined()
    w.unmount()
  })
  it('показывает превью; тап ставит фото и убирает список; сохранение уносит ссылку', async () => {
    mockFetch(async () => ({ ok: true, json: async () => ({ results: [{ thumbnail: 'https://o/1.jpg', title: 'Кофе' }, { thumbnail: 'https://o/2.jpg', title: 'Чашка' }] }) }))
    const w = form()
    await w.get('input[type="text"]').setValue('Кофе')
    await w.get('[data-testid="find-photo"]').trigger('click')
    await flushPromises()
    const pics = w.findAll('[data-testid="found-photo"]')
    expect(pics).toHaveLength(2)
    await pics[1].trigger('click')
    expect(w.find('[data-testid="find-photo-results"]').exists()).toBe(false)
    expect((w.get('#item-form-image').element as HTMLInputElement).value).toBe('https://o/2.jpg')
    await w.findAll('button').find((b) => b.text() === 'Сохранить')!.trigger('click')
    expect(w.emitted('save')![0][0]).toMatchObject({ name: 'Кофе', image_url: 'https://o/2.jpg' })
    w.unmount()
  })
  it('ничего не нашлось и сбой сети — разные сообщения', async () => {
    mockFetch(async () => ({ ok: true, json: async () => ({ results: [] }) }))
    const w = form()
    await w.get('input[type="text"]').setValue('Кофе')
    await w.get('[data-testid="find-photo"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="find-photo-empty"]').exists()).toBe(true)
    expect(w.find('[data-testid="find-photo-error"]').exists()).toBe(false)
    mockFetch(async () => { throw new Error('offline') })
    await w.get('[data-testid="find-photo"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="find-photo-error"]').exists()).toBe(true)
    expect(w.find('[data-testid="find-photo-empty"]').exists()).toBe(false)
    w.unmount()
  })
})
