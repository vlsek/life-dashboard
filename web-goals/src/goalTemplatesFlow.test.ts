import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'

// BACKLOG 76.8: «Шаблоны» → выбор → обычная форма уже заполнена → «Сохранить» отдаёт в addGoal поля шаблона.
const api = vi.hoisted(() => ({ addGoal: vi.fn() }))
vi.mock('./lib/useGoals', () => ({
  useGoals: () => ({
    auth: ref({ status: 'ready', userId: 'u1', userEmail: 'a@b.c' }),
    items: ref([]), error: ref(null), flashed: ref({}), init: () => {},
    addGoal: api.addGoal, updateGoal: vi.fn(), deleteGoal: vi.fn(), toggleGoal: vi.fn(), stepGoal: vi.fn(), setStage: vi.fn(),
  }),
}))
import App from './App.vue'
import { GOAL_TEMPLATES } from './lib/goalTemplates'

beforeEach(() => {
  localStorage.setItem('site_lang', 'ru')
  api.addGoal.mockReset()
  api.addGoal.mockResolvedValue(undefined)
})

describe('шаблоны целей: путь от кнопки до сохранения', () => {
  it('выбранный шаблон заполняет форму, сохранение пишет его название, этапы и сложность', async () => {
    const w = mount(App, { attachTo: document.body })
    expect(w.find('[data-test="goal-templates-modal"]').exists()).toBe(false)
    await w.find('[data-test="goal-templates-btn"]').trigger('click')
    expect(w.find('[data-test="goal-templates-modal"]').exists()).toBe(true)
    const tpl = GOAL_TEMPLATES[0]
    await w.findAll('[data-test="goal-tpl-pick"]')[0].trigger('click')
    expect(w.find('[data-test="goal-templates-modal"]').exists()).toBe(false)
    expect((w.find('input[type="text"]').element as HTMLInputElement).value).toBe(tpl.ru.name)
    await w.find('[data-test="goal-form-save"]').trigger('click')
    await flushPromises()
    expect(api.addGoal).toHaveBeenCalledTimes(1)
    const res = api.addGoal.mock.calls[0][1]
    expect(res.name).toBe(tpl.ru.name)
    expect(res.stages).toBe(tpl.stages)
    expect(res.difficulty).toBe(tpl.difficulty)
    w.unmount()
  })
  it('после шаблона обычная «Добавить» открывает пустую форму', async () => {
    const w = mount(App, { attachTo: document.body })
    await w.find('[data-test="goal-templates-btn"]').trigger('click')
    await w.findAll('[data-test="goal-tpl-pick"]')[0].trigger('click')
    w.unmount()
    const w2 = mount(App, { attachTo: document.body })
    await w2.find('[data-test="goal-add"]').trigger('click')
    expect((w2.find('input[type="text"]').element as HTMLInputElement).value).toBe('')
    w2.unmount()
  })
})
