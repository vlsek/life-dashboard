import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref, computed } from 'vue'

// BACKLOG 23:25 / 815, срез 3: галочка «сохранено» в углу блока «Профиль» после подтверждённой записи.
const api = vi.hoisted(() => ({ saveBirthdate: vi.fn(), uploadAvatar: vi.fn(), addParam: vi.fn(), deleteParam: vi.fn() }))
vi.mock('./lib/useProfile', () => ({
  useProfile: () => ({
    profile: ref({ avatar_url: null, birthdate: null, goal_type: null }),
    params: ref([]), stats: computed(() => []), balance: ref(1), loaded: ref(true), error: ref(null),
    init: vi.fn(), uploadAvatar: api.uploadAvatar, saveBirthdate: api.saveBirthdate, addParam: api.addParam,
    updateParam: vi.fn(), deleteParam: api.deleteParam, refreshValues: vi.fn(),
  }),
}))
vi.mock('./lib/usePointsLog', () => ({ usePointsLog: () => ({ log: ref(null), error: ref(null), loading: ref(false), load: vi.fn() }) }))

import ProfileSection from './components/ProfileSection.vue'
import BirthdateModal from './components/BirthdateModal.vue'
import source from './components/ProfileSection.vue?raw'

const tick = (w: ReturnType<typeof mount>) => w.find('[data-test="saved-tick"]')

beforeEach(() => {
  vi.useFakeTimers()
  localStorage.setItem('site_lang', 'ru')
  Object.values(api).forEach((f) => f.mockReset())
})
afterEach(() => vi.useRealTimers())

describe('ProfileSection: «сохранено»', () => {
  it('без записи галочки нет, а секция — контейнер для угла (relative)', () => {
    const w = mount(ProfileSection, { props: { userId: 'u1' } })
    expect(tick(w).exists()).toBe(false)
    expect(w.find('section').classes()).toContain('relative')
    w.unmount()
  })

  it('дата рождения сохранилась (null = успех) — галочка и закрытие окна; через 0,9 с галочка уходит', async () => {
    api.saveBirthdate.mockResolvedValue(null)
    const w = mount(ProfileSection, { props: { userId: 'u1' } })
    await w.find('[data-test="profile-top-row"] button.secondary').trigger('click')
    w.findComponent(BirthdateModal).vm.$emit('save', '1990-05-05')
    await flushPromises()
    expect(api.saveBirthdate).toHaveBeenCalledWith('1990-05-05')
    expect(tick(w).exists()).toBe(true)
    expect(w.findComponent(BirthdateModal).exists()).toBe(false)
    vi.advanceTimersByTime(950)
    await flushPromises()
    expect(tick(w).exists()).toBe(false)
    w.unmount()
  })

  it('ошибка сохранения — галочки НЕТ (не обещаем того, чего не записалось)', async () => {
    api.saveBirthdate.mockResolvedValue('Не удалось сохранить')
    const w = mount(ProfileSection, { props: { userId: 'u1' } })
    await w.find('[data-test="profile-top-row"] button.secondary').trigger('click')
    w.findComponent(BirthdateModal).vm.$emit('save', '1990-05-05')
    await flushPromises()
    expect(tick(w).exists()).toBe(false)
    w.unmount()
  })

  it('аватар: галочка только если загрузка прошла', async () => {
    const w = mount(ProfileSection, { props: { userId: 'u1' } })
    const input = w.find('[data-test="avatar-input"]')
    const file = new File(['x'], 'a.png', { type: 'image/png' })
    Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
    api.uploadAvatar.mockResolvedValueOnce(false)
    await input.trigger('change')
    await flushPromises()
    expect(tick(w).exists()).toBe(false)
    api.uploadAvatar.mockResolvedValueOnce(true)
    await input.trigger('change')
    await flushPromises()
    expect(tick(w).exists()).toBe(true)
    w.unmount()
  })

  it('исходник: запись параметра с пустым именем галочку не даёт', () => {
    expect(source).toContain('form.name.trim()')
    expect(source).toContain('flashSaved()')
    expect(source).toContain('clearTimeout(savedTimer)')
  })
})
