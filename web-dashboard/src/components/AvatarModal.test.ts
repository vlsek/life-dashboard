import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AvatarModal from './AvatarModal.vue'
import { ANIMALS, animalAvatarUrl } from '../lib/animalAvatars'

// BACKLOG раздел 29, срез 2: окно выбора аватарки на Дашборде.
describe('AvatarModal', () => {
  it('показывает все 20 животных', () => {
    const w = mount(AvatarModal, { props: { current: null } })
    expect(ANIMALS.length).toBe(20)
    for (const a of ANIMALS) expect(w.find(`[data-test="avatar-${a.key}"]`).exists()).toBe(true)
  })
  it('клик по животному шлёт pick с ключом', async () => {
    const w = mount(AvatarModal, { props: { current: null } })
    await w.find('[data-test="avatar-fox"]').trigger('click')
    expect(w.emitted('pick')?.[0]).toEqual(['fox'])
  })
  it('текущее животное подсвечено, остальные нет', () => {
    const w = mount(AvatarModal, { props: { current: animalAvatarUrl('owl') } })
    expect(w.find('[data-test="avatar-owl"]').attributes('aria-checked')).toBe('true')
    expect(w.find('[data-test="avatar-cat"]').attributes('aria-checked')).toBe('false')
  })
  it('«Загрузить своё фото» шлёт upload, фон закрывает окно, ошибка видна', async () => {
    const w = mount(AvatarModal, { props: { current: null, error: 'Не удалось сохранить' } })
    await w.find('[data-test="avatar-upload"]').trigger('click')
    expect(w.emitted('upload')).toHaveLength(1)
    expect(w.text()).toContain('Не удалось сохранить')
    await w.find('[data-test="avatar-modal"]').trigger('click')
    expect(w.emitted('close')).toHaveLength(1)
  })
})
