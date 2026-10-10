import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AvatarModal from './AvatarModal.vue'
import { ANIMALS, animalAvatarUrl } from '../lib/animalAvatars'

// BACKLOG 44.17: окно выбора аватарки в «Аккаунте».
describe('AvatarModal (Аккаунт)', () => {
  it('показывает все 20 животных; фото Google — только если оно есть', () => {
    const w = mount(AvatarModal, { props: { current: null, googleAvatar: null } })
    for (const a of ANIMALS) expect(w.find(`[data-test="avatar-${a.key}"]`).exists()).toBe(true)
    expect(w.find('[data-test="avatar-google"]').exists()).toBe(false)
    const g = mount(AvatarModal, { props: { current: null, googleAvatar: 'https://lh3.googleusercontent.com/a/x' } })
    expect(g.find('[data-test="avatar-google"]').exists()).toBe(true)
  })
  it('клик по животному → pick(key); по фото Google → google', async () => {
    const w = mount(AvatarModal, { props: { current: null, googleAvatar: 'https://lh3.googleusercontent.com/a/x' } })
    await w.find('[data-test="avatar-wolf"]').trigger('click')
    expect(w.emitted('pick')?.[0]).toEqual(['wolf'])
    await w.find('[data-test="avatar-google"]').trigger('click')
    expect(w.emitted('google')).toHaveLength(1)
  })
  it('подсвечивает текущее: животное или фото Google', () => {
    const a = mount(AvatarModal, { props: { current: animalAvatarUrl('owl'), googleAvatar: 'https://g.example/p' } })
    expect(a.find('[data-test="avatar-owl"]').attributes('aria-checked')).toBe('true')
    expect(a.find('[data-test="avatar-google"]').attributes('aria-checked')).toBe('false')
    const g = mount(AvatarModal, { props: { current: 'https://g.example/p', googleAvatar: 'https://g.example/p' } })
    expect(g.find('[data-test="avatar-google"]').attributes('aria-checked')).toBe('true')
  })
  it('выбор файла → upload(File); ошибка видна; busy блокирует выбор; фон закрывает', async () => {
    const w = mount(AvatarModal, { props: { current: null, googleAvatar: null, error: 'Не вышло', busy: true } })
    const file = new File(['x'], 'me.png', { type: 'image/png' })
    const input = w.find('[data-test="avatar-input"]')
    Object.defineProperty(input.element, 'files', { value: [file] })
    await input.trigger('change')
    expect(w.emitted('upload')?.[0]).toEqual([file])
    expect(w.find('[data-test="avatar-error"]').text()).toBe('Не вышло')
    expect(w.find('[data-test="avatar-cat"]').attributes('disabled')).toBeDefined()
    await w.find('[data-test="avatar-modal"]').trigger('click')
    expect(w.emitted('close')).toHaveLength(1)
  })
})
