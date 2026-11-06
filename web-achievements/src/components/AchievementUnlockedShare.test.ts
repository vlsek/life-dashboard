import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const calls: string[] = []
let result: 'shared' | 'downloaded' | 'cancelled' = 'shared'
let failRender = false
vi.mock('../lib/shareCard', () => ({
  cardFileName: (k: string) => `f-${k}.png`,
  renderCardBlob: async (spec: { title: string; grade: string }) => { if (failRender) throw new Error('canvas'); calls.push('render:' + spec.grade + ':' + spec.title); return new Blob(['x']) },
  shareOrDownload: async (_b: Blob, name: string) => { calls.push('share:' + name); return result },
}))

import AchievementUnlockedModal from './AchievementUnlockedModal.vue'
import { ACHIEVEMENTS, evaluate } from '../lib/achievements'

const states = () => evaluate({} as never, ACHIEVEMENTS).slice(0, 1)

beforeEach(() => { calls.length = 0; result = 'shared'; failRender = false; localStorage.setItem('site_lang', 'ru') })

describe('AchievementUnlockedModal: «Поделиться» (78.3)', () => {
  it('кнопка есть; нажатие собирает карточку по текущему достижению и отдаёт её на шаринг', async () => {
    const w = mount(AchievementUnlockedModal, { props: { states: states() } })
    expect(w.get('[data-testid="unlocked-share"]').text()).toBe('Поделиться')
    await w.get('[data-testid="unlocked-share"]').trigger('click')
    await flushPromises()
    expect(calls[0]).toMatch(/^render:/)
    expect(calls[1]).toMatch(/^share:f-.+\.png$/)
    expect(w.find('[data-testid="unlocked-share-status"]').exists()).toBe(false) // шаринг прошёл — молчим
  })
  it('если вместо шаринга скачали файл — подпись «Картинка сохранена»', async () => {
    result = 'downloaded'
    const w = mount(AchievementUnlockedModal, { props: { states: states() } })
    await w.get('[data-testid="unlocked-share"]').trigger('click'); await flushPromises()
    expect(w.get('[data-testid="unlocked-share-status"]').text()).toContain('сохранена')
  })
  it('ошибка отрисовки — понятная строка, окно живо, кнопка снова доступна', async () => {
    failRender = true
    const w = mount(AchievementUnlockedModal, { props: { states: states() } })
    await w.get('[data-testid="unlocked-share"]').trigger('click'); await flushPromises()
    expect(w.get('[data-testid="unlocked-share-status"]').text()).toContain('Не получилось')
    expect((w.get('[data-testid="unlocked-share"]').element as HTMLButtonElement).disabled).toBe(false)
    expect(w.find('[data-testid="achievement-unlocked"]').exists()).toBe(true)
  })
  it('«Дальше»/«Закрыть» по-прежнему работают', async () => {
    const w = mount(AchievementUnlockedModal, { props: { states: states() } })
    await w.get('[data-testid="unlocked-next"]').trigger('click')
    expect(w.emitted('close')).toBeTruthy()
  })
})
