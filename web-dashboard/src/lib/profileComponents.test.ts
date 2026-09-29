import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import BirthdateModal from '../components/BirthdateModal.vue'
import BodyParamFormModal from '../components/BodyParamFormModal.vue'
import BodyParamsModal from '../components/BodyParamsModal.vue'
import type { BodyParam } from './profile'

const weight: BodyParam = { id: 'w', name: 'Вес', icon: 'svg:scale', unit: 'кг', position: 0 }

describe('BirthdateModal', () => {
  it('эмитит введённую дату', async () => {
    const w = mount(BirthdateModal, { props: { initial: null } })
    await w.find('input[type="date"]').setValue('1999-03-04')
    await w.findAll('button').at(-1)!.trigger('click')
    expect(w.emitted('save')![0]).toEqual(['1999-03-04'])
  })
  it('показывает ошибку от родителя и подставляет текущее значение', () => {
    const w = mount(BirthdateModal, { props: { initial: '1999-03-04', error: 'bad' } })
    expect((w.find('input[type="date"]').element as HTMLInputElement).value).toBe('1999-03-04')
    expect(w.text()).toContain('bad')
  })
})

describe('BodyParamFormModal', () => {
  it('пустое имя не сохраняется', async () => {
    const w = mount(BodyParamFormModal, { props: { existing: null } })
    await w.findAll('button').at(-1)!.trigger('click')
    expect(w.emitted('save')).toBeUndefined()
  })
  it('новый параметр: иконка по умолчанию svg:ruler, имя обрезается родителем', async () => {
    const w = mount(BodyParamFormModal, { props: { existing: null } })
    await w.find('input[type="text"]').setValue('Талия')
    await w.findAll('input[type="text"]').at(-1)!.setValue('см')
    await w.findAll('button').at(-1)!.trigger('click')
    expect(w.emitted('save')![0][0]).toMatchObject({ name: 'Талия', unit: 'см', icon: 'svg:ruler' })
  })
  it('редактирование подставляет существующие значения', () => {
    const w = mount(BodyParamFormModal, { props: { existing: weight } })
    expect((w.find('input[type="text"]').element as HTMLInputElement).value).toBe('Вес')
  })
})

describe('BodyParamsModal', () => {
  it('пустой список — подсказка; кнопки эмитят add/edit/remove', async () => {
    const empty = mount(BodyParamsModal, { props: { params: [] } })
    expect(empty.text().length).toBeGreaterThan(0)
    await empty.findAll('button.secondary').find((b) => b.text().length > 3)!.trigger('click')
    expect(empty.emitted('add')).toHaveLength(1)

    const w = mount(BodyParamsModal, { props: { params: [weight] } })
    const [edit, remove] = w.findAll('li button')
    await edit.trigger('click')
    await remove.trigger('click')
    expect(w.emitted('edit')![0]).toEqual([weight])
    expect(w.emitted('remove')![0]).toEqual([weight])
  })
})

// ProfileSection целиком, с подменённым композаблом (без сети)
const state = {
  profile: ref<any>({ avatar_url: null, birthdate: '2000-05-10', goal_type: 'lose_weight' }),
  params: ref<BodyParam[]>([weight]),
  stats: ref<any[]>([{ param: weight, latest: 77.5, sinceFirst: -2.5, sincePrev: -0.5, tone: 'success' }]),
  balance: ref<number | null>(42),
  loaded: ref(true),
  error: ref<string | null>(null),
  init: vi.fn(),
  uploadAvatar: vi.fn(),
  saveBirthdate: vi.fn(async () => null),
  addParam: vi.fn(async () => null),
  updateParam: vi.fn(async () => null),
  deleteParam: vi.fn(async () => null),
}
vi.mock('./useProfile', () => ({ useProfile: () => state }))

describe('ProfileSection', () => {
  beforeEach(() => {
    state.init.mockClear()
    state.profile.value = { avatar_url: null, birthdate: '2000-05-10', goal_type: 'lose_weight' }
    state.balance.value = 42
  })

  it('вызывает init с userId и показывает параметр, дельту и баланс-ссылку в магазин', async () => {
    const { default: ProfileSection } = await import('../components/ProfileSection.vue')
    const w = mount(ProfileSection, { props: { userId: 'u1' } })
    await flushPromises()
    expect(state.init).toHaveBeenCalledWith('u1')
    const stat = w.find('[data-test="param-stat"]')
    expect(stat.text()).toContain('Вес: 77.5 кг')
    expect(stat.text()).toContain('-2.5 кг')
    const a = w.find('a')
    expect(a.attributes('href')).toBe('/shop/')
    expect(a.text()).toContain('42')
    w.unmount()
  })

  it('без даты рождения — кнопка «указать», клик открывает модалку', async () => {
    state.profile.value = { avatar_url: null, birthdate: null, goal_type: null }
    const { default: ProfileSection } = await import('../components/ProfileSection.vue')
    const w = mount(ProfileSection, { props: { userId: 'u1' }, attachTo: document.body })
    await flushPromises()
    const btn = w.findAll('button').find((b) => b.classes().includes('secondary') && b.text().length > 5)!
    await btn.trigger('click')
    expect(document.body.querySelector('input[type="date"]')).not.toBeNull()
    w.unmount()
  })

  it('без userId ничего не грузит', async () => {
    const { default: ProfileSection } = await import('../components/ProfileSection.vue')
    const w = mount(ProfileSection, { props: { userId: null } })
    await flushPromises()
    expect(state.init).not.toHaveBeenCalled()
    w.unmount()
  })
})
